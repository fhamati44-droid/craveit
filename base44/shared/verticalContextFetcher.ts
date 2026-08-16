// ============================================================================
// verticalContextFetcher — orchestrates the DB reads needed to build a
// vertical_strategy_context for the DemandDecision Engine. DemandDecision owns
// the final decision; this is an INPUT only. Pure strategy logic lives in
// verticalStrategy.ts (buildRecommendation / applySafetyPrecedence /
// buildVerticalStrategyContext). This module mirrors the fetch orchestration
// used by campaignRecommendationEngine so both engines share ONE brain for
// "WHAT usually works here?" — DemandDecision remains the "SHOULD we act?".
// [Vertical→Demand Bridge §3, §19]
// ============================================================================

import {
  detectDaypart, resolveDemandExpectation,
  matchDaypartStrategies, matchPlaybooks, buildRecommendation,
  applySafetyPrecedence, buildVerticalStrategyContext,
} from "./verticalStrategy.ts";

function hhmm(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Build the advisory vertical_strategy_context for a restaurant. Returns null
 * when the restaurant has no primary vertical (vertical intelligence absent).
 * Never throws — a missing vertical layer must not break the decision engine.
 */
export async function fetchVerticalStrategyContext(svc: any, restaurant_id: string, test_time?: string): Promise<any> {
  if (!restaurant_id) return null;
  try {
    const now = test_time ? new Date(test_time) : new Date();
    const day = now.getDay();
    const daypart = detectDaypart(now);

    const restaurant = await svc.entities.Restaurant.get(restaurant_id).catch(() => null);
    if (!restaurant) return null;
    const verticalId = restaurant.primary_vertical_id;
    if (!verticalId) return null;

    const vertical = await svc.entities.MenuVertical.get(verticalId).catch(() => null);
    const daypartStrategies = await svc.entities.VerticalDaypartStrategy.filter({ vertical_id: verticalId, active: true }).catch(() => []);
    const playbooks = await svc.entities.VerticalCampaignPlaybook.filter({ vertical_id: verticalId, active: true }).catch(() => []);

    const recentOrders = await svc.entities.RestaurantSubOrder.filter({ restaurant_id }).catch(() => []);
    let historical: any = null;
    if (recentOrders?.length) {
      const windowStart = new Date(now.getTime() - 14 * 86400000);
      const inWindow = recentOrders.filter((o: any) => new Date(o.created_date || o.updated_date || 0) >= windowStart);
      if (inWindow.length >= 5) historical = { demand_level: inWindow.length > 40 ? "busy" : inWindow.length > 15 ? "medium" : "quiet" };
    }
    const dayProfiles = await svc.entities.DemandDayProfile.filter({ restaurant_id, day_of_week: day }).catch(() => []);
    const demandSchedule = dayProfiles?.[0] || null;
    const opSignals = await svc.entities.RestaurantOperationalSignal.filter({ restaurant_id, status: "active" }).catch(() => []);
    const operationalSignals = opSignals?.[0] || null;
    const matchedDaypart = matchDaypartStrategies({ verticalId, day, time: hhmm(now), strategies: daypartStrategies });
    const verticalStrategy = matchedDaypart[0] || null;
    const demand = resolveDemandExpectation({ historical, demandSchedule, operationalSignals, verticalStrategy });

    const matchedPlaybooks = matchPlaybooks({ verticalId, daypart, playbooks });
    const playbook = matchedPlaybooks[0] || null;

    const offers = await svc.entities.RestaurantMealOffer.filter({ restaurant_id, active: true, available: true }).catch(() => []);
    const usable = (offers || []).filter((o: any) => !o.sold_out);
    const tier = playbook?.preferred_tiers?.[0] || verticalStrategy?.preferred_tiers?.[0] || "classic";
    const tierOffers = usable.filter((o: any) => o.mapped_tier === tier || o.package_id === tier);
    const chosenOffers = (tierOffers.length ? tierOffers : usable).slice(0, 4);
    const restaurantItemIds = chosenOffers.map((o: any) => o.id);
    const masterProductIds = [...new Set(chosenOffers.map((o: any) => o.mapped_tamam_product_id || o.meal_id).filter(Boolean))];

    const policy = await svc.entities.DemandExecutionPolicy.filter({ restaurant_id }).catch(() => []);
    const guardrail = policy?.[0] || null;
    const guardrailCtx = {
      max_campaign_orders: guardrail?.max_campaign_orders || 20,
      learning_mode: guardrail?.automation_mode !== "MANUAL",
      learning_mode_order_cap: guardrail?.learning_mode_order_cap,
      surplus_signal: operationalSignals?.operational_effect === "surplus" || false,
      sold_out_items: (offers || []).filter((o: any) => o.sold_out).map((o: any) => o.id),
    };
    const previousResults = await svc.entities.CampaignLearning.filter({ restaurant_id }).catch(() => []);

    // safety context (mirrors campaignRecommendationEngine precedence chain)
    let operationalBlock = { blocked: false, reason: "" };
    if (!restaurant.accepts_orders || restaurant.current_status === "closed" || restaurant.current_status === "temporarily_unavailable")
      operationalBlock = { blocked: true, reason: "restaurant_closed" };
    else if (restaurant.current_status === "busy") operationalBlock = { blocked: true, reason: "busy" };
    const pressureSig = (opSignals || []).find((s: any) => s.type === "kitchen_pressure" || s.type === "temporary_pause");
    if (pressureSig) operationalBlock = { blocked: true, reason: pressureSig.type === "temporary_pause" ? "restaurant_closed" : "high_pressure" };

    const surplusSig = (opSignals || []).find((s: any) => s.type === "surplus" && (s.status || "active") === "active");
    const surplusFact = surplusSig ? { qty: surplusSig.quantity || 0, until: surplusSig.expires_at || null } : null;

    const soldOutIds = (offers || []).filter((o: any) => o.sold_out || o.available === false).map((o: any) => o.id);
    const anyAvailable = usable.length > 0;
    const naturalTargetIds = tierOffers.map((o: any) => o.id);
    const tierTargetSoldOut = naturalTargetIds.length > 0 && naturalTargetIds.every((id: string) => soldOutIds.includes(id));

    const commercialGuardrails = await svc.entities.CommercialGuardrail.filter({ restaurant_id, status: "active" }).catch(() => []);
    const proposedPrice = chosenOffers.length ? Math.min(...chosenOffers.map((o: any) => Number(o.price || 0))) : 0;
    let commercial = { safe: true, floorViolated: false, valueAddAllowed: true, pointsAllowed: true };
    for (const cg of (commercialGuardrails || [])) {
      const minPrice = cg.minimum_customer_offer_price, minNet = cg.minimum_restaurant_net;
      const violated = (minPrice != null && proposedPrice > 0 && proposedPrice < minPrice)
        || (minNet != null && proposedPrice > 0 && (proposedPrice - Number(cg.tamam_contribution || 0)) < minNet);
      if (violated) { commercial.floorViolated = true; commercial.safe = false; }
      const allowed = cg.allowed_offer_types || [];
      if (allowed.length) {
        if (!allowed.includes("VALUE_ADD")) commercial.valueAddAllowed = false;
        if (!allowed.includes("POINT_LOCKED")) commercial.pointsAllowed = false;
      }
    }

    const allOffers = await svc.entities.CampaignOffer.filter({ restaurant_id }).catch(() => []);
    const liveOffers = (allOffers || []).filter((o: any) => ["active", "scheduled"].includes(o.status));
    const campaignLoad = { activeCount: liveOffers.length, max: guardrail?.max_simultaneous_campaigns || 0 };

    let restaurantOverride: any = null;
    if (restaurant.vertical_strategy_override_json) {
      try {
        const ov = JSON.parse(restaurant.vertical_strategy_override_json);
        if (ov && (ov.objective || ov.mechanic || ov.tier)) restaurantOverride = { objective: ov.objective, mechanic: ov.mechanic, tier: ov.tier };
      } catch {}
    }

    const draft = buildRecommendation({
      restaurant, vertical, daypart, demand, daypartStrategy: verticalStrategy, playbook,
      masterProductIds, restaurantItemIds, guardrail: guardrailCtx, previousResults,
      missing: [], reasons: [], testTime: test_time,
    });
    draft._playbookName = playbook?.name || null;

    const safety = {
      operationalBlock,
      itemUnavailable: { anyAvailable, soldOutIds, tierTargetSoldOut },
      commercial, campaignLoad,
      existingConflict: { conflict: false },
      surplus: surplusFact,
      restaurantOverride,
      partnerFacts: { recommendedWindows: [] },
      historical: { level: historical?.demand_level || null, pressureInWindow: false },
    };
    const rec = applySafetyPrecedence(draft, safety);
    return buildVerticalStrategyContext({
      rec, safety, playbooks: matchedPlaybooks, daypartStrategy: verticalStrategy,
      vertical, restaurant, previousResults, offers, missing: [],
    });
  } catch (e) {
    console.error("verticalContextFetcher error", e);
    return null;
  }
}