import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/partnerShared.ts';
import { json } from '../../shared/httpHelpers.ts';
import {
  DEMO_SCENARIOS, DEMO_BATCH, PRIORITY_SCORE, CONFIDENCE, SAFETY, CAPACITY,
  OBJECTIVE_TO_CAMPAIGN, MECHANISM_TO_OFFER_TYPE,
} from '../../shared/demandDecisionConfig.ts';
import {
  calcSafeAdditionalCapacity, calcDemandGap, calcDemandState, hardBlockers,
  calcOpportunityScore, decideDemandAction, recommendStrategy, recommendObjective,
  recommendQuota, mapDecisionToOpportunityType, generateExplanation,
  cannibalizationLabel, compareStrategies, calcInterventionCost,
  calcExpectedIncrementalValue, mechanismVariant, costLabel,
  type DecisionInputs,
} from '../../shared/demandDecisionLogic.ts';

// ============================================================================
// demandDecisionEngine — the intelligence layer ABOVE the existing
// Opportunity / Campaign / CampaignOffer / UnifiedOffer system.
// It answers: "Should TAMAM create additional demand?" — and if so, recommends
// a strategy + quota. It does NOT build offers or touch checkout safety.
// Accepted decisions reuse the EXISTING Opportunity entity (mapped to an
// existing opportunity_type) — no second opportunity system.
//
// MILESTONE 2: corrected capacity/gap semantics (no double subtraction),
// partner-owned capacity model with source priority + confidence, strategy V2
// (objective + mechanism), intervention cost, expected incremental value,
// strategy comparison, data-source labeling, active-campaign reevaluation.
// ============================================================================

function iso(d: Date) { return d.toISOString(); }
function now() { return Date.now(); }

// Next occurrence of weekday at HH:MM (Asia/Jerusalem-ish, +3 offset handled loosely).
function nextWeekday(targetDay: number, h: number, m: number): Date {
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  let cur = d.getDay();
  let add = (targetDay - cur + 7) % 7;
  if (add === 0 && d.getTime() < now()) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

async function getDemoRestaurant(SR: any) {
  const list = await SR.entities.Restaurant.filter({ is_demo: true, demo_batch_id: 'tamam-demo-partner-v1' }).catch(() => []);
  return (list || [])[0] || null;
}

async function findDemoShawarma(SR: any, rid: string) {
  const items = await SR.entities.RestaurantMealOffer.filter({ restaurant_id: rid, is_demo: true }).catch(() => []);
  return (items || []).find((m: any) => {
    const n = ((m.restaurant_product_name || m.meal_name_snapshot || '') + ' ' + (m.short_description_ar || '')).toLowerCase();
    return n.includes('شاورما') || n.includes('shawarma');
  }) || null;
}

// ---- Build a DecisionInputs from a demo scenario config ----
async function buildScenarioInputs(SR: any, scenario: any, testTime?: string): Promise<{ inputs: DecisionInputs; window_start: string; window_end: string; now_ms: number; upcoming: boolean }> {
  const rest = await getDemoRestaurant(SR);
  const sh = rest ? await findDemoShawarma(SR, rest.id) : null;
  const startD = nextWeekday(scenario.day, scenario.start.h, scenario.start.m);
  const endD = nextWeekday(scenario.day, scenario.end.h, scenario.end.m);
  const winStart = startD.getTime();
  const winEnd = endD.getTime();
  const nowMs = testTime ? new Date(testTime).getTime() : (winStart + 30 * 60 * 1000); // default: 30min into window
  const upcoming = nowMs < winStart;

  const inp = scenario.inputs;
  const inputs: DecisionInputs = {
    restaurant_id: rest?.id || '',
    tamam_product_id: sh?.mapped_tamam_product_id || sh?.meal_id || null,
    restaurant_item_id: sh?.id || null,
    mealset_variant_id: inp.mealset_variant_id || null,
    restaurant_open: inp.restaurant_open,
    restaurant_status: inp.restaurant_status,
    pressure_active: inp.pressure_active,
    traffic_light: inp.traffic_light,
    product_priority: inp.product_priority,
    product_available: inp.product_available,
    mapping_valid: inp.mapping_valid,
    safe_operational_target: inp.safe_operational_target ?? inp.safe_capacity ?? 0,
    baseline_orders: inp.baseline_orders,
    projected_natural_orders: inp.projected_natural_orders,
    existing_campaign_commitment: inp.existing_campaign_commitment,
    desired_demand_target: inp.desired_demand_target ?? null,
    audience_segment: inp.audience_segment,
    audience_size: inp.audience_size,
    audience_intent_score: inp.audience_intent_score,
    cannibalization_score: inp.cannibalization_score,
    fatigue_score: inp.fatigue_score,
    operational_risk: inp.operational_risk,
    campaign_saturation: inp.campaign_saturation,
    commercial_safe: inp.commercial_safe,
    commercial_score: inp.commercial_score,
    approval_required: inp.approval_required,
    restaurant_priority_score: inp.restaurant_priority_score,
    urgency_score: inp.urgency_score,
    data_confidence: inp.data_confidence,
    learning_mode: inp.learning_mode,
    automation_mode: inp.automation_mode,
    surplus_qty: inp.surplus_qty ?? null,
    capacity_source: inp.capacity_source || 'heuristic_fallback',
  };
  return { inputs, window_start: iso(startD), window_end: iso(endD), now_ms: nowMs, upcoming };
}

// ============================================================================
// CAPACITY RESOLUTION (Milestone 2) — strict source priority + confidence.
// Returns { target, source, confidence }.
// ============================================================================
function resolveCapacity(rest: any, trafficLight: string, pressure: boolean, surplusQty: number | null, dayLevel: string): {
  target: number; source: string; confidence: number;
} {
  // 1. real-time operational restriction -> cap 0 (high confidence for "now")
  if (pressure || trafficLight === 'RED' || rest.current_status === 'busy' || rest.current_status === 'temporarily_unavailable' || !rest.accepts_orders) {
    return { target: 0, source: 'realtime_restriction', confidence: CAPACITY.source_confidence.realtime_restriction };
  }
  // 2. temporary restaurant signal (surplus quantity IS the available capacity)
  if (surplusQty != null && surplusQty > 0) {
    return { target: Number(surplusQty), source: 'temporary_signal', confidence: CAPACITY.source_confidence.temporary_signal };
  }
  // 3. time-specific configured capacity (weak/peak) by traffic light
  if (dayLevel === 'quiet' && rest.capacity_weak_period_additional != null) {
    return { target: Number(rest.capacity_weak_period_additional), source: 'time_specific', confidence: CAPACITY.source_confidence.time_specific };
  }
  if (dayLevel === 'busy' && rest.capacity_peak_period_additional != null) {
    return { target: Math.round(Number(rest.capacity_peak_period_additional)), source: 'time_specific', confidence: CAPACITY.source_confidence.time_specific };
  }
  // 4. restaurant default configured capacity (partner-provided)
  if (rest.capacity_normal_additional_per_hour != null) {
    let cap = Number(rest.capacity_normal_additional_per_hour);
    // apply peak multiplier under yellow (reduced capacity)
    if (trafficLight === 'YELLOW') cap = Math.round(cap * CAPACITY.peak_multiplier);
    // use weak multiplier under green (full)
    return { target: cap, source: 'restaurant_default', confidence: rest.capacity_confidence != null ? Number(rest.capacity_confidence) : CAPACITY.source_confidence.restaurant_default };
  }
  // 5. historical inferred capacity — handled by caller via order history; here we signal unknown
  // 6. heuristic fallback (lowest confidence)
  let fb = SAFETY.default_safe_capacity;
  if (trafficLight === 'YELLOW') fb = Math.round(fb * 0.6);
  return { target: fb, source: 'heuristic_fallback', confidence: CAPACITY.source_confidence.heuristic_fallback };
}

// ---- Build DecisionInputs from REAL data (production path) ----
async function buildRealInputs(SR: any, payload: any): Promise<{ inputs: DecisionInputs; window_start: string; window_end: string; now_ms: number; upcoming: boolean; data_sources: any }> {
  const rid: string = payload.restaurant_id;
  if (!rid) throw new Error('restaurant_id required');
  const rest = await SR.entities.Restaurant.get(rid).catch(() => null);
  if (!rest) throw new Error('restaurant not found');

  // window
  const winStart = payload.window_start ? new Date(payload.window_start).getTime() : now();
  const winEnd = payload.window_end ? new Date(payload.window_end).getTime() : winStart + 2 * 3600 * 1000;
  const nowMs = payload.test_time ? new Date(payload.test_time).getTime() : now();
  const upcoming = nowMs < winStart;
  const day = new Date(winStart).getDay();
  const startH = new Date(winStart).getHours();

  // product / item
  const item = payload.restaurant_item_id ? await SR.entities.RestaurantMealOffer.get(payload.restaurant_item_id).catch(() => null) : null;
  const productId = payload.tamam_product_id ?? item?.mapped_tamam_product_id ?? null;
  const mappingValid = !!(item && item.mapped_tamam_product_id) || productId != null;
  const productAvailable = item ? (item.active && item.available && !item.sold_out) : true;

  // demand profile / traffic light (from WeeklyDemandProfile + DemandDayProfile)
  const profile = (await SR.entities.WeeklyDemandProfile.filter({ restaurant_id: rid }).catch(() => []))[0] || null;
  const dayProfiles = await SR.entities.DemandDayProfile.filter({ restaurant_id: rid, day_of_week: day }).catch(() => []);
  const dp = (dayProfiles || [])[0];
  const effLevel = dp?.effective_demand_level || 'unknown';
  const trafficLight = effLevel === 'busy' ? 'RED' : effLevel === 'medium' ? 'YELLOW' : effLevel === 'quiet' ? 'GREEN' : 'GREEN';

  // operational signals
  const sigs = await SR.entities.RestaurantOperationalSignal.filter({ restaurant_id: rid, status: 'active' }).catch(() => []);
  const pressure = (sigs || []).some((s: any) => s.type === 'kitchen_pressure' || s.type === 'temporary_pause');
  const surplusSig = (sigs || []).find((s: any) => s.type === 'surplus');
  const surplusQty = surplusSig?.quantity ?? null;
  const restaurantOpen = rest.current_status === 'open' && rest.accepts_orders;
  const restaurantStatus = rest.current_status || 'open';

  // CAPACITY resolution (source priority + confidence)
  const cap = resolveCapacity(rest, trafficLight, pressure, surplusQty, effLevel);

  // existing campaign commitment (real) — active/scheduled CampaignOffers overlapping window
  const offers = await SR.entities.CampaignOffer.filter({ restaurant_id: rid }).catch(() => []);
  let committed = 0;
  for (const o of (offers || [])) {
    if (o.is_demo) continue;
    if (!['active', 'scheduled'].includes(o.status)) continue;
    const s = o.start_at ? new Date(o.start_at).getTime() : 0;
    const e = o.end_at ? new Date(o.end_at).getTime() : Infinity;
    if (winEnd > s && winStart < e) {
      committed += Math.max(0, (o.quota_total == null ? 0 : o.quota_total) - (o.quota_used || 0));
    }
  }

  // baseline from REAL history: delivered RestaurantSubOrders in same weekday + same hour-band, last 8 weeks
  const allOrders = await SR.entities.RestaurantSubOrder.filter({ restaurant_id: rid, status: 'delivered' }).catch(() => []);
  const comparable: any[] = [];
  for (const o of (allOrders || [])) {
    const t = o.updated_date ? new Date(o.updated_date).getTime() : (o.created_date ? new Date(o.created_date).getTime() : 0);
    if (!t) continue;
    const od = new Date(t);
    if (now() - t > 56 * 86400000) continue;
    if (od.getDay() !== day) continue;
    if (Math.abs(od.getHours() - startH) > 2) continue;
    comparable.push(o);
  }
  let baseline: number;
  let baselineSource: string;
  let confidence: number;
  if (comparable.length >= CONFIDENCE.min_sample_size) {
    baseline = comparable.length / Math.max(1, Math.min(8, new Set(comparable.map((o) => new Date(o.updated_date || o.created_date).toDateString())).size));
    baselineSource = 'ACTUAL';
    confidence = Math.min(0.85, 0.4 + comparable.length * 0.05);
  } else {
    // fallback heuristic: traffic-light-based estimate. Reduced confidence.
    const fb = trafficLight === 'RED' ? 22 : trafficLight === 'YELLOW' ? 12 : trafficLight === 'GREEN' ? 6 : 8;
    baseline = fb;
    baselineSource = 'HEURISTIC';
    confidence = 0.3;
  }

  // projected natural = baseline + small lift from recent intent (TamamSuggestionClick last 24h)
  const clicks = await SR.entities.TamamSuggestionClick.filter({ restaurant_id: rid }).catch(() => []);
  const recentClicks = (clicks || []).filter((c: any) => now() - new Date(c.created_date).getTime() < 86400000).length;
  const intentLift = Math.min(3, Math.round(recentClicks * 0.2));
  const projected = Math.max(0, Math.round((baseline + intentLift) * 10) / 10);

  // If capacity was heuristic fallback but we have decent order history, try historical inference
  let capacityTarget = cap.target;
  let capacitySource = cap.source;
  let capacityConfidence = cap.confidence;
  if (capacitySource === 'heuristic_fallback' && comparable.length >= 2) {
    // historical inferred: peak comparable-hour orders as a proxy for absorbable capacity
    const peakHour = comparable.reduce((mx: number, o: any) => {
      const od = new Date(o.updated_date || o.created_date);
      return Math.max(mx, od.getHours() === startH ? 1 : 0);
    }, 0);
    // crude: average weekly comparable orders, scaled to per-window absorbable
    const inferred = Math.max(5, Math.round((comparable.length / Math.max(1, new Set(comparable.map((o) => new Date(o.updated_date || o.created_date).toDateString())).size)) * 2));
    capacityTarget = inferred;
    capacitySource = 'historical_inferred';
    capacityConfidence = comparable.length >= 6 ? 0.65 : 0.5;
  }

  // audience — real segment sizes
  const audience = await findAudience(SR, rid, null);

  // cannibalization
  const repeatAtWindow = (allOrders || []).filter((o: any) => {
    const t = o.updated_date ? new Date(o.updated_date).getTime() : 0;
    return t && new Date(t).getDay() === day && Math.abs(new Date(t).getHours() - startH) <= 2;
  }).length;
  const cannibalizationScore = audience.segment === 'NEW_TO_RESTAURANT' ? 0.1
    : audience.segment === 'REPEAT_CUSTOMER' ? 0.7
    : Math.min(0.9, repeatAtWindow / 20);

  // fatigue: recent campaign impressions for this restaurant (last 7d)
  const events = await SR.entities.CampaignEvent.filter({ restaurant_id: rid, event_type: 'impression' }).catch(() => []);
  const recentImpressions = (events || []).filter((e: any) => now() - new Date(e.created_date).getTime() < 7 * 86400000).length;
  const fatigueScore = Math.min(1, recentImpressions / (audience.size || 1) / 3);

  // commercial safety: candidate offer price vs CommercialGuardrail floor
  let commercialSafe = true, commercialScore = 0.85, approvalRequired = false;
  let normalPrice: number | null = null, customerPrice: number | null = null, tamamContribution = 0, restaurantContribution = 0, unlockPoints = 0;
  if (item && item.price) {
    normalPrice = Number(item.price);
    const guardrails = await SR.entities.CommercialGuardrail.filter({ restaurant_id: rid, status: 'active' }).catch(() => []);
    const g = (guardrails || []).find((x: any) => !x.menu_item_id || x.menu_item_id === item.id);
    // candidate: 90% of normal (heuristic offer)
    customerPrice = Math.round(normalPrice * 0.9 * 100) / 100;
    tamamContribution = Math.round((normalPrice - customerPrice) * 0.4 * 100) / 100; // heuristic split
    restaurantContribution = Math.round((normalPrice - customerPrice - tamamContribution) * 100) / 100;
    if (g && g.minimum_customer_offer_price) {
      commercialSafe = customerPrice >= g.minimum_customer_offer_price;
      commercialScore = commercialSafe ? 0.9 : 0.3;
      approvalRequired = !commercialSafe;
    }
    if (g && g.minimum_restaurant_net != null) {
      const net = customerPrice - tamamContribution;
      if (net < g.minimum_restaurant_net) { commercialSafe = false; commercialScore = 0.3; approvalRequired = true; }
    }
  }

  // data confidence: blend baseline confidence + capacity confidence
  confidence = Math.min(confidence, Math.max(confidence * 0.6 + capacityConfidence * 0.4, capacityConfidence));
  if (!profile) confidence = Math.min(confidence, 0.4);
  if (!mappingValid) confidence = Math.min(confidence, 0.3);
  const learningMode = comparable.length < CONFIDENCE.min_sample_size || capacitySource === 'heuristic_fallback';

  const priority = payload.product_priority || (surplusQty != null ? 'SURPLUS' : 'NORMAL');

  const inputs: DecisionInputs = {
    restaurant_id: rid,
    tamam_product_id: productId ?? null,
    restaurant_item_id: item?.id || payload.restaurant_item_id || null,
    mealset_variant_id: payload.mealset_variant_id || null,
    restaurant_open: restaurantOpen,
    restaurant_status: restaurantStatus,
    pressure_active: pressure,
    traffic_light: trafficLight,
    product_priority: priority,
    product_available: productAvailable,
    mapping_valid: mappingValid,
    safe_operational_target: capacityTarget,
    baseline_orders: baseline,
    projected_natural_orders: projected,
    existing_campaign_commitment: committed,
    desired_demand_target: payload.desired_demand_target ?? null,
    audience_segment: audience.segment,
    audience_size: audience.size,
    audience_intent_score: audience.intent,
    cannibalization_score: cannibalizationScore,
    fatigue_score: fatigueScore,
    operational_risk: pressure ? 0.9 : trafficLight === 'RED' ? 0.8 : trafficLight === 'YELLOW' ? 0.4 : 0.1,
    campaign_saturation: capacityTarget > 0 ? Math.min(1, committed / capacityTarget) : 0,
    commercial_safe: commercialSafe,
    commercial_score: commercialScore,
    approval_required: approvalRequired,
    restaurant_priority_score: PRIORITY_SCORE[priority] ?? 0.6,
    urgency_score: surplusQty != null ? 1 : (trafficLight === 'GREEN' ? 0.5 : 0.3),
    data_confidence: confidence,
    learning_mode: learningMode,
    automation_mode: 'MANUAL',
    surplus_qty: surplusQty,
    capacity_source: capacitySource,
    normal_price: normalPrice,
    customer_price: customerPrice,
    tamam_contribution: tamamContribution,
    restaurant_contribution: restaurantContribution,
    unlock_points: unlockPoints,
  };

  const data_sources = {
    baseline_orders: baselineSource,
    projected_natural_orders: baselineSource === 'ACTUAL' ? 'INFERRED' : 'HEURISTIC',
    safe_operational_target: capacitySource === 'restaurant_default' || capacitySource === 'time_specific' ? 'PARTNER_PROVIDED' : capacitySource === 'historical_inferred' ? 'INFERRED' : 'HEURISTIC',
    existing_campaign_commitment: 'ACTUAL',
    audience: 'INFERRED',
    cannibalization: 'INFERRED',
    commercial: item ? 'PARTNER_PROVIDED' : 'HEURISTIC',
  };
  return { inputs, window_start: iso(new Date(winStart)), window_end: iso(new Date(winEnd)), now_ms: nowMs, upcoming, data_sources };
}

// ---- Find a real audience segment + size for a restaurant ----
async function findAudience(SR: any, rid: string, phoneHint?: string): Promise<{ segment: string; size: number; intent: number }> {
  const clicks = await SR.entities.TamamSuggestionClick.filter({ restaurant_id: rid }).catch(() => []);
  const orderPhones = new Set(((await SR.entities.RestaurantSubOrder.filter({ restaurant_id: rid, status: 'delivered' }).catch(() => [])) || []).map((o: any) => o.customer_phone).filter(Boolean));
  const clickPhones = new Set((clicks || []).map((c: any) => c.phone).filter(Boolean));
  const newToRest = [...clickPhones].filter((p) => !orderPhones.has(p)).length;

  const allOrders = (await SR.entities.RestaurantSubOrder.filter({ restaurant_id: rid, status: 'delivered' }).catch(() => [])) || [];
  const lastByPhone: Record<string, number> = {};
  for (const o of allOrders) {
    const t = o.updated_date ? new Date(o.updated_date).getTime() : (o.created_date ? new Date(o.created_date).getTime() : 0);
    if (!o.customer_phone || !t) continue;
    lastByPhone[o.customer_phone] = Math.max(lastByPhone[o.customer_phone] || 0, t);
  }
  const lapsed30 = Object.values(lastByPhone).filter((t) => { const d = (now() - t) / 86400000; return d >= 30 && d < 60; }).length;
  const lapsed60 = Object.values(lastByPhone).filter((t) => (now() - t) / 86400000 >= 60).length;

  const accs = await SR.entities.LoyaltyAccount.list('-balance', 200).catch(() => []);
  const pointsEngaged = (accs || []).filter((a: any) => (a.balance || 0) >= 40).length;

  const candidates = [
    { segment: 'NEW_TO_RESTAURANT', size: newToRest, intent: 0.8 },
    { segment: 'LAPSED_30', size: lapsed30, intent: 0.6 },
    { segment: 'LAPSED_60', size: lapsed60, intent: 0.5 },
    { segment: 'POINTS_ENGAGED', size: pointsEngaged, intent: 0.65 },
  ];
  candidates.sort((a, b) => (b.size * b.intent) - (a.size * a.intent));
  const best = candidates[0];
  return { segment: best.segment, size: best.size, intent: best.intent };
}

// ---- Run the full decision pipeline on built inputs ----
async function runDecision(SR: any, ctx: { inputs: DecisionInputs; window_start: string; window_end: string; now_ms: number; upcoming: boolean; scenario_key?: string; test_time?: string; data_sources?: any }) {
  const { inputs, window_start, window_end, upcoming, scenario_key, test_time, data_sources } = ctx;
  const { decision, blockers, score, components, state } = decideDemandAction(inputs, upcoming);
  const objectiveV2 = recommendObjective(inputs, decision);
  const alternatives = compareStrategies(inputs, objectiveV2, decision);
  const rec = recommendStrategy(inputs, decision);
  const { quota, explore_exploit } = recommendQuota(inputs, decision, rec.strategy || undefined);
  const expl = generateExplanation(inputs, decision, rec, quota, { score, components });
  const cann = cannibalizationLabel(inputs.cannibalization_score);
  const safeAdditional = calcSafeAdditionalCapacity(inputs);
  const gap = calcDemandGap(inputs);
  const target = inputs.surplus_qty != null ? inputs.surplus_qty : inputs.safe_operational_target;

  // intervention cost + expected value for the recommended mechanism
  const mech = rec.strategy || '';
  const interventionCost = mech ? calcInterventionCost(inputs, mech) : 0;
  const ev = mech ? calcExpectedIncrementalValue(inputs, mech, quota) : { orders: 0, revenue: 0, tamam_cost: 0, restaurant_settlement: 0 };

  const record = {
    restaurant_id: inputs.restaurant_id,
    tamam_product_id: inputs.tamam_product_id ?? null,
    restaurant_item_id: inputs.restaurant_item_id ?? null,
    mealset_variant_id: inputs.mealset_variant_id ?? null,
    window_start, window_end,
    demand_state: state,
    baseline_orders: inputs.baseline_orders,
    projected_natural_orders: inputs.projected_natural_orders,
    safe_operational_target: target,
    safe_additional_capacity: safeAdditional,
    existing_campaign_commitment: inputs.existing_campaign_commitment,
    desired_demand_target: inputs.desired_demand_target ?? null,
    demand_gap: gap,
    audience_segment: inputs.audience_segment,
    audience_size: inputs.audience_size,
    audience_intent_score: inputs.audience_intent_score,
    commercial_safety_score: inputs.commercial_score,
    commercial_safe: inputs.commercial_safe,
    cannibalization_risk: cann,
    cannibalization_risk_score: inputs.cannibalization_score,
    campaign_fatigue_score: inputs.fatigue_score,
    restaurant_priority_score: inputs.restaurant_priority_score,
    data_confidence_score: inputs.data_confidence,
    urgency_score: inputs.urgency_score,
    capacity_source: inputs.capacity_source || '',
    opportunity_score: score,
    score_components: JSON.stringify(components),
    hard_blockers: blockers,
    decision,
    recommended_objective: rec.objective,
    recommended_strategy: rec.strategy,
    recommended_variant: rec.variant,
    recommended_quota: quota,
    explore_exploit,
    learning_mode: inputs.learning_mode,
    automation_mode: inputs.automation_mode,
    intervention_cost_score: interventionCost,
    expected_incremental_orders: ev.orders,
    expected_incremental_revenue: ev.revenue,
    expected_tamam_contribution_cost: ev.tamam_cost,
    expected_restaurant_settlement: ev.restaurant_settlement,
    strategy_alternatives: JSON.stringify(alternatives),
    data_sources: JSON.stringify(data_sources || {}),
    explanation_internal: expl.internal,
    explanation_partner: expl.partner,
    source_signal_ids: [],
    scenario_key: scenario_key || '',
    test_time: test_time || '',
    is_demo: !!scenario_key,
    demo_batch_id: scenario_key ? DEMO_BATCH : '',
  };
  return { record, score, components, decision, blockers, rec, quota, alternatives, objectiveV2 };
}

// ============================================================================
// ACTIVE CAMPAIGN SAFETY REEVALUATION (recommendation only — no autonomous change)
// Scenarios 28 (pressure) & 29 (pressure cleared).
// Returns: CONTINUE | PAUSE_RECOMMENDED | COMPLETE_RECOMMENDED | RESUME_RECOMMENDED
// ============================================================================
async function reevaluateActiveCampaign(SR: any, payload: any): Promise<any> {
  const offer = await SR.entities.CampaignOffer.get(payload.offer_id).catch(() => null);
  if (!offer) return { recommendation: 'COMPLETE_RECOMMENDED', reason: 'offer_not_found' };
  if (offer.is_demo && !payload.include_demo) return { recommendation: 'COMPLETE_RECOMMENDED', reason: 'demo_not_included' };

  const rest = await SR.entities.Restaurant.get(offer.restaurant_id).catch(() => null);
  const sigs = await SR.entities.RestaurantOperationalSignal.filter({ restaurant_id: offer.restaurant_id, status: 'active' }).catch(() => []);
  const pressure = (sigs || []).some((s: any) => s.type === 'kitchen_pressure' || s.type === 'temporary_pause');
  const restaurantOpen = rest ? (rest.current_status === 'open' && rest.accepts_orders) : true;
  const restaurantBusy = rest?.current_status === 'busy' || rest?.current_status === 'temporarily_unavailable';

  const evalNow = (payload.include_demo && payload.test_time) ? new Date(payload.test_time).getTime() : now();
  const start = offer.start_at ? new Date(offer.start_at).getTime() : 0;
  const end = offer.end_at ? new Date(offer.end_at).getTime() : Infinity;
  const total = offer.quota_total == null ? null : offer.quota_total;
  const soldOut = total != null && (offer.quota_used || 0) >= total;
  const expired = evalNow >= end;
  const upcoming = evalNow < start;

  // PAUSE if pressure / busy / closed (scenario 28)
  if (pressure || restaurantBusy || !restaurantOpen) {
    return {
      recommendation: 'PAUSE_RECOMMENDED',
      reason: pressure ? 'restaurant_pressure' : !restaurantOpen ? 'restaurant_closed' : 'restaurant_busy',
      safe_additional_capacity: 0,
      demand_state: 'OVERLOADED',
      message_ar: 'المطعم عليه ضغط — بنوصي بإيقاف الحملة مؤقتاً. الطلبات المدفوعة ما تتأثر.',
    };
  }
  // COMPLETE if expired / sold out (scenario 29 negative branch)
  if (expired) return { recommendation: 'COMPLETE_RECOMMENDED', reason: 'offer_expired', message_ar: 'العرض انتهى.' };
  if (soldOut) return { recommendation: 'COMPLETE_RECOMMENDED', reason: 'sold_out', message_ar: 'الكمية خلصت.' };
  if (upcoming) return { recommendation: 'CONTINUE', reason: 'offer_upcoming', message_ar: 'العرض لسه ما بدأ.' };

  // Pressure cleared: reevaluate value (scenario 29)
  // If time remains, capacity available, offer valid, expected value positive -> RESUME
  const timeRemainsMs = end - evalNow;
  const timeRemainsMin = Math.round(timeRemainsMs / 60000);
  const remaining = total != null ? Math.max(0, total - (offer.quota_used || 0)) : null;
  // expected value proxy: remaining quota * price > 0
  const valuePositive = (remaining == null || remaining > 0) && timeRemainsMin > 5 && (offer.customer_price || 0) > 0;

  // Heuristic capacity: if restaurant configured capacity, check room
  let safeAdditional = null;
  if (rest?.capacity_normal_additional_per_hour != null) {
    const cap = Number(rest.capacity_normal_additional_per_hour);
    // crude: assume projected natural ~ half cap; safe additional ~ cap - projected
    safeAdditional = Math.max(0, cap - Math.round(cap * 0.5));
  }

  if (valuePositive && (safeAdditional == null || safeAdditional > 0)) {
    return {
      recommendation: 'RESUME_RECOMMENDED',
      reason: 'pressure_cleared_capacity_available',
      time_remaining_min: timeRemainsMin,
      remaining_quota: remaining,
      safe_additional_capacity: safeAdditional,
      message_ar: 'الضغط انفرج — في قدرة وقت متبقي، بنوصي باستئناف الحملة.',
    };
  }
  return {
    recommendation: 'COMPLETE_RECOMMENDED',
    reason: 'no_remaining_value',
    time_remaining_min: timeRemainsMin,
    remaining_quota: remaining,
    safe_additional_capacity: safeAdditional,
    message_ar: 'ما في قيمة متبقية — بنوصي بإغلاق الحملة.',
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const SR = base44.asServiceRole;
    const { action, payload } = await req.json();

    // ---- evaluate (scenario OR real) ----
    if (action === 'evaluate') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      let ctx;
      if (payload.scenario_key) {
        const scenario = DEMO_SCENARIOS.find((s) => s.key === payload.scenario_key);
        if (!scenario) return json({ error: 'unknown_scenario' }, 400);
        ctx = await buildScenarioInputs(SR, scenario, payload.test_time);
        ctx.scenario_key = payload.scenario_key;
        ctx.test_time = payload.test_time || '';
        ctx.data_sources = {
          baseline_orders: 'DEMO_OVERRIDE', projected_natural_orders: 'DEMO_OVERRIDE',
          safe_operational_target: 'DEMO_OVERRIDE', existing_campaign_commitment: 'DEMO_OVERRIDE',
          audience: 'DEMO_OVERRIDE', cannibalization: 'DEMO_OVERRIDE', commercial: 'DEMO_OVERRIDE',
        };
      } else if (payload.custom_inputs) {
        // Lab custom override mode — every input is DEMO_OVERRIDE, no real data read.
        const ci = payload.custom_inputs;
        const rest = ci.restaurant_id ? await SR.entities.Restaurant.get(ci.restaurant_id).catch(() => null) : null;
        const inputs: DecisionInputs = {
          restaurant_id: ci.restaurant_id || '',
          tamam_product_id: ci.tamam_product_id ?? null,
          restaurant_item_id: ci.restaurant_item_id ?? null,
          mealset_variant_id: ci.mealset_variant_id || null,
          restaurant_open: ci.restaurant_open ?? true,
          restaurant_status: ci.restaurant_status || 'open',
          pressure_active: !!ci.pressure_active,
          traffic_light: ci.traffic_light || 'GREEN',
          product_priority: ci.product_priority || 'NORMAL',
          product_available: ci.product_available ?? true,
          mapping_valid: ci.mapping_valid ?? true,
          safe_operational_target: ci.safe_operational_target ?? ci.safe_capacity ?? 20,
          baseline_orders: ci.baseline_orders ?? 0,
          projected_natural_orders: ci.projected_natural_orders ?? 0,
          existing_campaign_commitment: ci.existing_campaign_commitment ?? 0,
          desired_demand_target: ci.desired_demand_target ?? null,
          audience_segment: ci.audience_segment || 'NEW_TO_RESTAURANT',
          audience_size: ci.audience_size ?? 0,
          audience_intent_score: ci.audience_intent_score ?? 0.5,
          cannibalization_score: ci.cannibalization_score ?? 0.1,
          fatigue_score: ci.fatigue_score ?? 0.1,
          operational_risk: ci.operational_risk ?? 0.1,
          campaign_saturation: ci.campaign_saturation ?? 0,
          commercial_safe: ci.commercial_safe ?? true,
          commercial_score: ci.commercial_score ?? 0.85,
          approval_required: !!ci.approval_required,
          restaurant_priority_score: ci.restaurant_priority_score ?? PRIORITY_SCORE[ci.product_priority || 'NORMAL'] ?? 0.6,
          urgency_score: ci.urgency_score ?? 0.5,
          data_confidence: ci.data_confidence ?? 0.7,
          learning_mode: !!ci.learning_mode,
          automation_mode: ci.automation_mode || 'MANUAL',
          surplus_qty: ci.surplus_qty ?? null,
          capacity_source: ci.capacity_source || 'heuristic_fallback',
          normal_price: ci.normal_price ?? null,
          customer_price: ci.customer_price ?? null,
          tamam_contribution: ci.tamam_contribution ?? null,
          restaurant_contribution: ci.restaurant_contribution ?? null,
          unlock_points: ci.unlock_points ?? null,
        };
        const winStart = ci.window_start || iso(new Date());
        const winEnd = ci.window_end || iso(new Date(Date.now() + 2 * 3600000));
        ctx = { inputs, window_start: winStart, window_end: winEnd, now_ms: payload.test_time ? new Date(payload.test_time).getTime() : now(), upcoming: false, data_sources: { baseline_orders: 'DEMO_OVERRIDE', projected_natural_orders: 'DEMO_OVERRIDE', safe_operational_target: 'DEMO_OVERRIDE', existing_campaign_commitment: 'DEMO_OVERRIDE', audience: 'DEMO_OVERRIDE', cannibalization: 'DEMO_OVERRIDE', commercial: 'DEMO_OVERRIDE' } };
      } else {
        ctx = await buildRealInputs(SR, payload);
      }
      const result = await runDecision(SR, ctx);
      const saved = await SR.entities.DemandDecision.create(result.record).catch((e: any) => { console.error('DemandDecision create', e); return null; });
      return json({
        data: {
          ...result.record, id: saved?.id || null,
          score_components_obj: result.components,
          strategy_alternatives_obj: result.alternatives,
          expected_match: payload.scenario_key ? matchExpected(payload.scenario_key, result.decision, result.rec.strategy) : null,
        },
      });
    }

    // ---- run all demo scenarios (checkpoint convenience) ----
    if (action === 'runScenarios') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const out = [];
      for (const scenario of DEMO_SCENARIOS) {
        const ctx = await buildScenarioInputs(SR, scenario);
        ctx.scenario_key = scenario.key;
        ctx.data_sources = {};
        const result = await runDecision(SR, ctx);
        out.push({
          key: scenario.key,
          label: scenario.label,
          decision: result.decision,
          opportunity_score: result.score,
          demand_state: result.record.demand_state,
          demand_gap: result.record.demand_gap,
          safe_additional: result.record.safe_additional_capacity,
          safe_operational_target: result.record.safe_operational_target,
          recommended_strategy: result.rec.strategy,
          recommended_objective: result.rec.objective,
          recommended_quota: result.quota,
          explore_exploit: result.record.explore_exploit,
          cannibalization: result.record.cannibalization_risk,
          hard_blockers: result.blockers,
          capacity_source: result.record.capacity_source,
          intervention_cost_score: result.record.intervention_cost_score,
          expected_incremental_orders: result.record.expected_incremental_orders,
          alternatives: result.alternatives,
          expected: scenario.expected,
          expected_mechanism: scenario.expected_mechanism,
          expected_match: matchExpected(scenario.key, result.decision, result.rec.strategy),
          explanation_partner: result.record.explanation_partner,
        });
      }
      return json({ data: out });
    }

    // ---- list / get ----
    if (action === 'listDecisions') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      let list = payload?.restaurant_id
        ? await SR.entities.DemandDecision.filter({ restaurant_id: payload.restaurant_id }, '-created_date', 100).catch(() => [])
        : await SR.entities.DemandDecision.list('-created_date', 100).catch(() => []);
      list = list || [];
      if (payload?.decision) list = list.filter((d: any) => d.decision === payload.decision);
      return json({ data: list });
    }
    if (action === 'getDecision') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const d = await SR.entities.DemandDecision.get(payload.id).catch(() => null);
      if (!d) return json({ error: 'not_found' }, 404);
      let opp = null;
      if (d.created_opportunity_id) opp = await SR.entities.Opportunity.get(d.created_opportunity_id).catch(() => null);
      return json({ data: { ...d, opportunity: opp } });
    }
    if (action === 'dismissDecision') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const d = await SR.entities.DemandDecision.update(payload.id, { decision: 'NO_ACTION', hard_blockers: ['dismissed_by_admin'] }).catch(() => null);
      return json({ data: { id: d?.id } });
    }

    // ---- acceptDecision: create an EXISTING Opportunity (mapped), link back ----
    if (action === 'acceptDecision') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const d = await SR.entities.DemandDecision.get(payload.id).catch(() => null);
      if (!d) return json({ error: 'not_found' }, 404);
      if (['NO_ACTION', 'NEEDS_HUMAN_REVIEW'].includes(d.decision))
        return json({ error: 'decision_not_actionable' }, 400);
      const objective = d.recommended_objective || 'NEW_CUSTOMERS';
      const oppType = mapDecisionToOpportunityType(
        { surplus_qty: d.recommended_objective === 'SURPLUS' ? 1 : null } as any,
        objective,
      );
      const reason = `Generated by Demand Decision Engine (score ${d.opportunity_score}, ${d.decision}). ${d.explanation_partner || ''}`;
      const opp = await SR.entities.Opportunity.create({
        restaurant_id: d.restaurant_id,
        opportunity_type: oppType,
        related_menu_item_ids: d.restaurant_item_id ? [d.restaurant_item_id] : [],
        start_at: d.window_start,
        end_at: d.window_end,
        capacity: d.recommended_quota || null,
        priority: d.recommended_objective === 'SURPLUS' ? 'SURPLUS' : d.recommended_objective === 'STRENGTHEN_ITEM' ? 'STRENGTHEN' : 'NORMAL',
        reason,
        source: 'tamam_admin',
        status: 'NEW',
        demand_decision_id: d.id,
        is_demo: d.is_demo,
        demo_batch_id: d.demo_batch_id || '',
      });
      await SR.entities.DemandDecision.update(d.id, { created_opportunity_id: opp.id });
      return json({ data: { opportunity_id: opp.id, opportunity_type: oppType, demand_decision_id: d.id } });
    }

    // ---- active campaign safety reevaluation ----
    if (action === 'reevaluateActiveCampaign') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const result = await reevaluateActiveCampaign(SR, payload);
      return json({ data: result });
    }

    // ---- list demo scenarios (for Lab UI) ----
    if (action === 'listScenarios') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      return json({ data: DEMO_SCENARIOS.map((s) => ({ key: s.key, label: s.label, description: s.description, expected: s.expected, expected_mechanism: s.expected_mechanism, expected_explore: s.expected_explore, expected_quota_max: s.expected_quota_max, expected_not: s.expected_not, expected_mechanism_blacklist: s.expected_mechanism_blacklist })) });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error('demandDecisionEngine error', e);
    return json({ error: e.message || 'server_error' }, 500);
  }
}

function matchExpected(scenarioKey: string, decision: string, mechanism: string): { decision_ok: boolean; strategy_ok: boolean } {
  const sc = DEMO_SCENARIOS.find((s) => s.key === scenarioKey);
  if (!sc) return { decision_ok: false, strategy_ok: false };
  let decision_ok = (sc.expected as string[]).includes(decision);
  // mechanism check: whitelist OR blacklist OR empty
  let strategy_ok = true;
  if (sc.expected_mechanism && sc.expected_mechanism.length) {
    strategy_ok = !!(mechanism && (sc.expected_mechanism as string[]).includes(mechanism));
  }
  if (sc.expected_mechanism_blacklist && mechanism && (sc.expected_mechanism_blacklist as string[]).includes(mechanism)) {
    strategy_ok = false;
  }
  if (sc.expected_not && (sc.expected_not as string[]).includes(decision)) {
    decision_ok = false;
  }
  return { decision_ok, strategy_ok };
}