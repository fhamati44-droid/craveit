import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  detectDaypart, resolveVertical, resolveDemandExpectation,
  matchDaypartStrategies, matchPlaybooks, buildRecommendation,
  applySafetyPrecedence,
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
    const opSignals = await svc.entities.RestaurantOperationalSignal.filter({ restaurant_id, status: "active" }).catch(() => []);
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

    // 6b. SAFETY CONTEXT for precedence enforcement (section 1)
    const allOpSignals = opSignals || [];
    // 6b-1 operational block: restaurant status + pressure/pause signals
    let operationalBlock = { blocked: false, reason: "" };
    if (!restaurant.accepts_orders || restaurant.current_status === "closed" || restaurant.current_status === "temporarily_unavailable") {
      operationalBlock = { blocked: true, reason: "restaurant_closed" };
    } else if (restaurant.current_status === "busy") {
      operationalBlock = { blocked: true, reason: "busy" };
    }
    const pressureSig = allOpSignals.find((s) => s.type === "kitchen_pressure" || s.type === "temporary_pause");
    if (pressureSig) operationalBlock = { blocked: true, reason: pressureSig.type === "temporary_pause" ? "restaurant_closed" : "high_pressure" };

    // 6b-2 surplus current fact (qty + until)
    const surplusSig = allOpSignals.find((s) => s.type === "surplus" && (s.status || "active") === "active");
    const surplusFact = surplusSig ? { qty: surplusSig.quantity || 0, until: surplusSig.expires_at || null } : null;

    // 6b-3 item availability
    const soldOutIds = (offers || []).filter((o) => o.sold_out || o.available === false).map((o) => o.id);
    const anyAvailable = usable.length > 0;
    const naturalTargetIds = tierOffers.map((o) => o.id);
    const tierTargetSoldOut = naturalTargetIds.length > 0 && naturalTargetIds.every((id) => soldOutIds.includes(id));

    // 6b-4 commercial guardrail (floor + allowed offer types)
    const commercialGuardrails = await svc.entities.CommercialGuardrail.filter({ restaurant_id, status: "active" }).catch(() => []);
    const cg = commercialGuardrails?.[0] || null;
    let commercial = { safe: true, floorViolated: false, valueAddAllowed: true, pointsAllowed: true };
    if (cg) {
      const minPrice = cg.minimum_customer_offer_price;
      const minNet = cg.minimum_restaurant_net;
      const proposedPrice = chosenOffers.length ? Math.min(...chosenOffers.map((o) => Number(o.price || 0))) : 0;
      const floorViolated = (minPrice != null && proposedPrice > 0 && proposedPrice < minPrice)
        || (minNet != null && proposedPrice > 0 && (proposedPrice - Number(cg.tamam_contribution || 0)) < minNet);
      const allowedTypes = cg.allowed_offer_types || [];
      const mechToOfferType = { FIRST_TRIAL: "FIRST_TRIAL", DIRECT_PRICE: "DIRECT_PRICE", VALUE_ADD: "VALUE_ADD", POINT_LOCKED: "POINT_LOCKED", TIME_AND_QUANTITY: "TIME_AND_QUANTITY", LIMITED_QUANTITY: "LIMITED_QUANTITY" };
      commercial = {
        safe: !floorViolated,
        floorViolated: !!floorViolated,
        valueAddAllowed: !allowedTypes.length || allowedTypes.includes("VALUE_ADD"),
        pointsAllowed: !allowedTypes.length || allowedTypes.includes("POINT_LOCKED"),
      };
      void mechToOfferType;
    }

    // 6b-5 campaign load (existing same-item conflict computed after draft build)
    const allOffers = await svc.entities.CampaignOffer.filter({ restaurant_id }).catch(() => []);
    const liveOffers = (allOffers || []).filter((o) => ["active", "scheduled"].includes(o.status));
    const campaignLoad = { activeCount: liveOffers.length, max: guardrail?.max_simultaneous_campaigns || 0 };
    const recStart = new Date(now.getTime());
    const recEnd = new Date(now.getTime() + 3 * 3600 * 1000);
    const overlap = (a, b) => {
      if (!a || !b) return false;
      const s1 = new Date(a).getTime(), e1 = new Date(b).getTime();
      return s1 < recEnd.getTime() && e1 > recStart.getTime();
    };

    // 6b-6 restaurant strategy override (JSON)
    let restaurantOverride = null;
    if (restaurant.vertical_strategy_override_json) {
      try {
        const ov = JSON.parse(restaurant.vertical_strategy_override_json);
        if (ov && (ov.objective || ov.mechanic || ov.tier)) restaurantOverride = { objective: ov.objective, mechanic: ov.mechanic, tier: ov.tier };
      } catch {}
    }

    // 6b-7 partner-provided facts (signals) — offer availability windows + reliable demand
    const partnerWindows = [];
    (chosenOffers || []).forEach((o) => {
      if (o.available_from_time && o.available_until_time) partnerWindows.push(`${o.available_from_time}-${o.available_until_time}`);
    });
    const partnerFacts = { recommendedWindows: [...new Set(partnerWindows)] };
    const reliableBusy = (demandSchedule?.effective_demand_level === "busy") || (operationalSignals?.demand_level === "busy");
    const historicalCtx = { level: historical?.demand_level || null, pressureInWindow: !!reliableBusy };

    // 7. Build recommendation (draft from playbook/daypart/fallback)
    const draft = buildRecommendation({
      restaurant, vertical, daypart, demand, daypartStrategy: verticalStrategy,
      playbook, masterProductIds, restaurantItemIds, guardrail: guardrailCtx,
      previousResults, missing, reasons, testTime: test_time,
    });
    draft._playbookName = playbook?.name || null;

    // 7a. existing same-item / time / audience campaign conflict (needs draft audience)
    const draftAudience = draft.recommended_audience || ["public"];
    const conflicting = liveOffers.find((o) =>
      restaurantItemIds.includes(o.restaurant_item_id) &&
      overlap(o.start_at, o.end_at) &&
      ((o.audience_rule || []).some((seg) => draftAudience.includes(seg)) || (o.audience_rule || []).includes("public") || draftAudience.includes("public")));
    const existingConflict = { conflict: !!conflicting, conflictingOfferId: conflicting?.id || null };

    const safety = {
      operationalBlock,
      itemUnavailable: { anyAvailable, soldOutIds, tierTargetSoldOut },
      commercial,
      campaignLoad,
      existingConflict,
      surplus: surplusFact,
      restaurantOverride,
      partnerFacts,
      historical: historicalCtx,
    };

    // 7b. Enforce authoritative precedence over the draft (operational → commercial
    // → current facts → override → playbook → daypart → fallback). The vertical
    // draft can NEVER override operational/commercial safety.
    const rec = applySafetyPrecedence(draft, safety);

    // Attach context
    rec.vertical_id = verticalId || null;
    rec.restaurant_id = restaurant_id;
    rec.generated_at = now.toISOString();
    rec.source_signals_json = JSON.stringify({
      daypart, day, demand_source: demand.source, demand_level: demand.level,
      historical: !!historical, demand_schedule: !!demandSchedule, operational_signal: !!operationalSignals,
      vertical_strategy: !!verticalStrategy, playbook: playbook?.name || null,
      offers_considered: (offers || []).length, offers_usable: usable.length,
      safety: {
        operational_block: safety.operationalBlock,
        item_unavailable: { anyAvailable: safety.itemUnavailable.anyAvailable, tierTargetSoldOut: safety.itemUnavailable.tierTargetSoldOut },
        commercial: { safe: safety.commercial.safe, floorViolated: safety.commercial.floorViolated },
        campaign_load: safety.campaignLoad,
        existing_conflict: safety.existingConflict,
        surplus: safety.surplus,
        restaurant_override: safety.restaurantOverride,
        partner_windows: safety.partnerFacts.recommendedWindows,
        reliable_busy: historicalCtx.pressureInWindow,
      },
      precedence_chain: rec._precedence_chain,
      source_labels: rec._source_labels,
    });

    // 8. Idempotency: avoid duplicate drafts for unchanged inputs (section 14).
    // Same restaurant + objective + mechanic + first item within the last 2h →
    // return the existing draft instead of creating a duplicate.
    const idemKey = `${restaurant_id}|${rec.recommended_objective}|${rec.recommended_mechanic}|${(rec.recommended_restaurant_items || [])[0] || ""}`;
    const recentDrafts = await svc.entities.CampaignRecommendation.filter({ restaurant_id, status: "draft" }).catch(() => []);
    const dup = (recentDrafts || []).find((d) => {
      const key = `${d.restaurant_id}|${d.recommended_objective}|${d.recommended_mechanic}|${(d.recommended_restaurant_items || [])[0] || ""}`;
      if (key !== idemKey) return false;
      const ageH = (now.getTime() - new Date(d.generated_at || d.created_date).getTime()) / 3600000;
      return ageH >= 0 && ageH < 2;
    });
    if (dup) {
      return Response.json({ recommendation: { ...rec, id: dup.id, status: "draft", idempotent: true } });
    }

    // 9. Save as DRAFT (never auto-publish)
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