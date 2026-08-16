import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  detectDaypart, resolveVertical, resolveDemandExpectation,
  matchDaypartStrategies, matchPlaybooks, buildRecommendation,
} from "../../shared/verticalStrategy.ts";

/**
 * campaignRecommendationEngine — produces explainable, draft-only campaign
 * recommendations using restaurant vertical + demand precedence chain.
 * Admin-only. Never auto-publishes a customer offer (section 4, 9).
 *
 * Payload: { restaurant_id, test_time?, mood_id? }
 * Returns: a CampaignRecommendation record (saved as draft) + full explanation.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin")
      return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { restaurant_id, test_time, mood_id } = body || {};
    if (!restaurant_id)
      return Response.json({ error: "restaurant_id required" }, { status: 400 });

    const svc = base44.asServiceRole;
    const now = test_time ? new Date(test_time) : new Date();
    const day = now.getDay();
    const daypart = detectDaypart(now);

    // 1. Restaurant
    const restaurant = await svc.entities.Restaurant.get(restaurant_id);
    if (!restaurant) return Response.json({ error: "Restaurant not found" }, { status: 404 });

    const verticalId = restaurant.primary_vertical_id;
    const missing = [];
    const reasons = [];
    if (!verticalId) missing.push("primary_vertical_id");

    // 2. Vertical + strategy tables
    let vertical = null;
    let daypartStrategies = [];
    let playbooks = [];
    if (verticalId) {
      vertical = await svc.entities.MenuVertical.get(verticalId).catch(() => null);
      daypartStrategies = await svc.entities.VerticalDaypartStrategy.filter({ vertical_id: verticalId, active: true }).catch(() => []);
      playbooks = await svc.entities.VerticalCampaignPlaybook.filter({ vertical_id: verticalId, active: true }).catch(() => []);
    }

    // 3. Demand precedence chain
    // 3a. Historical — recent orders volume by hour (heuristic from RestaurantSubOrder)
    let historical = null;
    const recentOrders = await svc.entities.RestaurantSubOrder.filter({ restaurant_id }).catch(() => []);
    if (recentOrders && recentOrders.length) {
      const windowStart = new Date(now.getTime() - 14 * 86400000);
      const inWindow = recentOrders.filter((o) => new Date(o.created_date || o.updated_date || 0) >= windowStart);
      if (inWindow.length >= 5) {
        // crude hourly density — if we have a reasonable sample, mark medium/busy
        historical = { demand_level: inWindow.length > 40 ? "busy" : inWindow.length > 15 ? "medium" : "quiet" };
      }
    }

    // 3b. Demand schedule (manual) — DemandDayProfile for today
    const dayProfiles = await svc.entities.DemandDayProfile.filter({ restaurant_id, day_of_week: day }).catch(() => []);
    const demandSchedule = dayProfiles?.[0] || null;

    // 3c. Operational signals — active RestaurantOperationalSignal
    const opSignals = await svc.entities.RestaurantOperationalSignal.filter({ restaurant_id, active: true }).catch(() => []);
    const operationalSignals = opSignals?.[0] || null;

    // 3d. Vertical default daypart strategy
    const matchedDaypart = matchDaypartStrategies({ verticalId, day, time: hhmm(now), strategies: daypartStrategies });
    const verticalStrategy = matchedDaypart[0] || null;

    const demand = resolveDemandExpectation({ historical, demandSchedule, operationalSignals, verticalStrategy });

    // 4. Match playbook
    const matchedPlaybooks = matchPlaybooks({ verticalId, daypart, playbooks });
    const playbook = matchedPlaybooks[0] || null;
    if (matchedPlaybooks.length === 0) missing.push("matching_playbook");

    // 5. Meal offers + meal sets — pick recommended items
    const offers = await svc.entities.RestaurantMealOffer.filter({ restaurant_id, active: true, available: true }).catch(() => []);
    const usable = (offers || []).filter((o) => !o.sold_out);
    // prefer offers that match the recommended tier
    let tier = playbook?.preferred_tiers?.[0] || verticalStrategy?.preferred_tiers?.[0] || "classic";
    const tierOffers = usable.filter((o) => o.mapped_tier === tier || o.package_id === tier);
    const chosenOffers = (tierOffers.length ? tierOffers : usable).slice(0, 4);
    const restaurantItemIds = chosenOffers.map((o) => o.id);
    const masterProductIds = [...new Set(chosenOffers.map((o) => o.mapped_tamam_product_id || o.meal_id).filter(Boolean))];
    if (!restaurantItemIds.length) missing.push("available_restaurant_items");

    // 6. Guardrails + previous results
    const policy = await svc.entities.DemandExecutionPolicy.filter({ restaurant_id }).catch(() => []);
    const guardrail = policy?.[0] || null;
    const guardrailCtx = {
      max_campaign_orders: guardrail?.max_campaign_orders || 20,
      learning_mode: guardrail?.automation_mode !== "MANUAL",
      learning_mode_order_cap: guardrail?.learning_mode_order_cap,
      surplus_signal: operationalSignals?.operational_effect === "surplus" || false,
      sold_out_items: (offers || []).filter((o) => o.sold_out).map((o) => o.id),
    };
    const previousResults = await svc.entities.CampaignLearning.filter({ restaurant_id }).catch(() => []);

    // 7. Build recommendation
    const rec = buildRecommendation({
      restaurant, vertical, daypart, demand, daypartStrategy: verticalStrategy,
      playbook, masterProductIds, restaurantItemIds, guardrail: guardrailCtx,
      previousResults, missing, reasons, testTime: test_time,
    });

    // Attach context
    rec.vertical_id = verticalId || null;
    rec.restaurant_id = restaurant_id;
    rec.generated_at = now.toISOString();
    rec.source_signals_json = JSON.stringify({
      daypart, day, demand_source: demand.source, demand_level: demand.level,
      historical: !!historical, demand_schedule: !!demandSchedule, operational_signal: !!operationalSignals,
      vertical_strategy: !!verticalStrategy, playbook: playbook?.name || null,
      offers_considered: (offers || []).length, offers_usable: usable.length,
    });

    // 8. Save as DRAFT (never auto-publish)
    const saved = await svc.entities.CampaignRecommendation.create({
      restaurant_id,
      vertical_id: verticalId || null,
      generated_at: now.toISOString(),
      recommended_objective: rec.recommended_objective,
      recommended_mechanic: rec.recommended_mechanic,
      recommended_tier: rec.recommended_tier,
      recommended_master_products: rec.recommended_master_products,
      recommended_restaurant_items: rec.recommended_restaurant_items,
      recommended_audience: rec.recommended_audience,
      recommended_placements: rec.recommended_placements,
      recommended_start_at: rec.recommended_start_at,
      recommended_end_at: rec.recommended_end_at,
      recommended_quota: rec.recommended_quota,
      reason_codes: rec.reason_codes,
      explanation_ar: rec.explanation_ar,
      confidence_score: rec.confidence_score,
      missing_data: rec.missing_data,
      source_signals_json: rec.source_signals_json,
      status: "draft",
      created_by: user.id,
    });

    return Response.json({ recommendation: { ...rec, id: saved.id, status: "draft" } });
  } catch (error) {
    console.error("campaignRecommendationEngine error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function hhmm(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}