// ============================================================================
// demandDecisionLogic — PURE deterministic decision calculations.
// No SDK, no IO, no black-box AI. Every function is explainable.
// Consumes a normalized `inputs` object (built by the backend function from
// real data OR from a demo scenario config) + the central config weights.
//
// MILESTONE 2 SEMANTICS (no double subtraction):
//   safe_operational_target  = total orders the restaurant can safely handle
//   projected_natural_demand  = expected orders WITHOUT a new TAMAM campaign
//   existing_campaign_commitment = incremental orders already committed
//   safety_buffer             = capacity intentionally held back
//   safe_additional_capacity  = target - projected - committed - buffer (>=0)
//   demand_gap                = safe_additional_capacity  (unless a separate
//                               desired_demand_target exists, then the smaller
//                               of (target' - projected - committed) and
//                               safe_additional_capacity). Demand gap is NEVER
//                               recomputed from scratch — it derives from
//                               safe_additional_capacity so the same inputs are
//                               not subtracted twice.
// ============================================================================

import {
  SCORE_WEIGHTS, PENALTY_WEIGHTS, DECISION_THRESHOLDS, SAFETY,
  CANNIBALIZATION, LEARNING_MODE, CAPACITY, INTERVENTION_COST,
  EXPECTED_VALUE, STRATEGY_COMPARISON, OBJECTIVE_TO_CAMPAIGN,
  STRATEGIC_OBJECTIVES, STRATEGIC_WEIGHTS, LEARNING_MODE_PROMOTION,
} from './demandDecisionConfig.ts';

export interface DecisionInputs {
  restaurant_id: string;
  tamam_product_id?: number | null;
  restaurant_item_id?: string | null;
  mealset_variant_id?: string | null;
  // operational
  restaurant_open: boolean;
  restaurant_status: string; // open | closed | busy | temporarily_unavailable
  pressure_active: boolean;
  traffic_light: string; // GREEN | YELLOW | RED | BLOCKED
  product_priority: string;
  product_available: boolean;
  mapping_valid: boolean;
  // demand / capacity (Milestone 2 corrected model)
  safe_operational_target: number;   // A — total safe capacity for window
  baseline_orders: number;
  projected_natural_orders: number;   // B
  existing_campaign_commitment: number; // C
  desired_demand_target?: number | null; // optional separate business target
  // audience
  audience_segment: string;
  audience_size: number;
  audience_intent_score: number;
  // risk
  cannibalization_score: number;
  fatigue_score: number;
  operational_risk: number;
  campaign_saturation: number;
  // commercial
  commercial_safe: boolean;
  commercial_score: number;
  approval_required: boolean;
  // meta
  restaurant_priority_score: number;
  urgency_score: number;
  data_confidence: number;
  learning_mode: boolean;
  automation_mode: string;
  surplus_qty?: number | null;
  capacity_source?: string; // realtime_restriction | temporary_signal | time_specific | restaurant_default | historical_inferred | heuristic_fallback
  // optional commercial breakdown for cost/expected-value (filled by engine)
  normal_price?: number | null;
  customer_price?: number | null;
  tamam_contribution?: number | null;
  restaurant_contribution?: number | null;
  unlock_points?: number | null;
}

function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}
function round(x: number): number {
  return Math.round(x * 100) / 100;
}
function floor1(x: number): number {
  return Math.max(0, Math.round(x * 10) / 10);
}

// ---- Safe additional capacity: target - projected - committed - buffer (>=0) ----
// surplus_qty overrides the target (a surplus signal IS the available capacity).
export function calcSafeAdditionalCapacity(i: DecisionInputs): number {
  if (i.pressure_active || i.traffic_light === 'RED') return 0;
  const target = i.surplus_qty != null ? i.surplus_qty : i.safe_operational_target;
  const add = target - i.projected_natural_orders - i.existing_campaign_commitment - SAFETY.buffer;
  return Math.max(0, Math.round(add * 10) / 10);
}

// ---- Demand gap: derives from safe_additional_capacity (no double subtraction) ----
// If a separate desired_demand_target exists, the gap is the smaller of
//   (desired_target - projected - committed) and safe_additional_capacity.
export function calcDemandGap(i: DecisionInputs): number {
  const safeAdditional = calcSafeAdditionalCapacity(i);
  if (i.desired_demand_target != null && isFinite(Number(i.desired_demand_target))) {
    const byTarget = Number(i.desired_demand_target) - i.projected_natural_orders - i.existing_campaign_commitment;
    return Math.max(0, Math.round(Math.min(byTarget, safeAdditional) * 10) / 10);
  }
  return safeAdditional;
}

// ---- Demand state (internal TAMAM, NOT the partner traffic light) ----
export function calcDemandState(i: DecisionInputs): string {
  if (!i.restaurant_open || i.restaurant_status === 'temporarily_unavailable' || i.traffic_light === 'BLOCKED')
    return 'BLOCKED';
  if (i.pressure_active || i.traffic_light === 'RED' || i.restaurant_status === 'busy')
    return 'OVERLOADED';
  if (i.safe_operational_target <= 0) return 'UNKNOWN';
  const gap = calcDemandGap(i);
  if (gap <= 0) return 'HEALTHY';
  const ratio = gap / i.safe_operational_target;
  if (ratio > 0.5) return 'NEEDS_DEMAND';
  return 'CAUTION';
}

export function cannibalizationLabel(score: number): string {
  if (score == null || !isFinite(score)) return 'UNKNOWN';
  if (score <= CANNIBALIZATION.low_max) return 'LOW';
  if (score <= CANNIBALIZATION.medium_max) return 'MEDIUM';
  return 'HIGH';
}

// ---- Hard blockers — evaluated FIRST, override the score ----
export function hardBlockers(i: DecisionInputs): string[] {
  const b: string[] = [];
  if (!i.restaurant_open || ['temporarily_unavailable', 'closed'].includes(i.restaurant_status))
    b.push('restaurant_closed');
  if (i.pressure_active || i.traffic_light === 'RED' || i.restaurant_status === 'busy')
    b.push('restaurant_pressure');
  if (!i.product_available) b.push('product_unavailable');
  if (i.mapping_valid === false) b.push('invalid_mapping');
  if (!i.commercial_safe) b.push('commercial_unsafe');
  const target = i.surplus_qty != null ? i.surplus_qty : i.safe_operational_target;
  const sat = target > 0 ? i.existing_campaign_commitment / target : 0;
  if (target > 0 && sat >= SAFETY.saturation_block) b.push('campaign_saturation');
  const gap = calcDemandGap(i);
  if (gap <= 0 && i.existing_campaign_commitment > 0) b.push('existing_campaign_fills_gap');
  if ((i.data_confidence ?? 0) < 0.2) b.push('critical_data_missing');
  return b;
}

// ---- Opportunity score: explainable, component-based, objective-aware ----
// Strategic objectives (loyalty / strengthen / AOV) create demand proactively,
// so the score weighs engagement + commercial safety + capacity availability
// over the demand gap. The objective must be chosen from business intent
// BEFORE scoring; the engine passes the preliminary objective here.
export function calcOpportunityScore(i: DecisionInputs, objective?: string): { score: number; components: any } {
  const target = i.surplus_qty != null ? i.surplus_qty : i.safe_operational_target;
  const safeAdditional = calcSafeAdditionalCapacity(i);
  const gap = calcDemandGap(i);
  const demandNeed = target > 0 ? clamp(gap / target) : 0;
  const capacityFit = target > 0 ? clamp(safeAdditional / target) : 0;
  const capacityAvailable = safeAdditional >= 1 ? 1 : 0; // binary: room for >= 1 order
  const audienceIntent = clamp(i.audience_intent_score || 0);
  const commercialSafety = clamp(i.commercial_score || 0);
  const priorityScore = clamp(i.restaurant_priority_score || 0);
  const urgency = clamp(i.urgency_score || 0);
  const dataConfidence = clamp(i.data_confidence || 0);
  const cannibalization = clamp(i.cannibalization_score || 0);
  const fatigue = clamp(i.fatigue_score || 0);
  const operationalRisk = clamp(i.operational_risk || 0);
  const saturation = clamp(i.campaign_saturation || 0);

  const strategic = !!(objective && STRATEGIC_OBJECTIVES.has(objective));
  const w: any = strategic ? STRATEGIC_WEIGHTS : SCORE_WEIGHTS;
  const pw = PENALTY_WEIGHTS;
  const capacityTerm = strategic ? capacityAvailable : capacityFit;
  const capacityWeight = strategic ? w.capacity_available : w.capacity_fit;
  const positive =
    w.demand_need * demandNeed +
    capacityWeight * capacityTerm +
    w.audience_intent * audienceIntent +
    w.commercial_safety * commercialSafety +
    w.restaurant_priority * priorityScore +
    w.urgency * urgency +
    w.data_confidence * dataConfidence;
  const negative =
    pw.cannibalization * cannibalization +
    pw.fatigue * fatigue +
    pw.operational_risk * operationalRisk +
    pw.campaign_saturation * saturation;
  const raw = positive - negative;
  const score = clamp(Math.round(raw * 100), 0, 100);
  return {
    score,
    components: {
      demandNeed: round(demandNeed), capacityFit: round(capacityFit), capacityAvailable,
      audienceIntent: round(audienceIntent), commercialSafety: round(commercialSafety),
      priorityScore: round(priorityScore), urgency: round(urgency),
      dataConfidence: round(dataConfidence),
      cannibalization: round(cannibalization), fatigue: round(fatigue),
      operationalRisk: round(operationalRisk), saturation: round(saturation),
      positive: round(positive), negative: round(negative),
      demand_gap: gap, safe_additional: safeAdditional,
      safe_operational_target: target,
      strategic, objective: objective || '',
    },
  };
}

// Preliminary objective chosen from business intent BEFORE scoring, so the
// score can be objective-aware (strategic vs reactive). Passes 'PREPARE' so
// recommendObjective does not short-circuit on a NO_ACTION decision.
function preliminaryObjective(i: DecisionInputs): string {
  return recommendObjective(i, 'PREPARE');
}

// ---- Decision: blockers first, then objective-aware score bands, then state override ----
export function decideDemandAction(i: DecisionInputs, upcoming: boolean): {
  decision: string; blockers: string[]; score: number; components: any; state: string; objective: string;
} {
  const blockers = hardBlockers(i);
  const objective = preliminaryObjective(i);
  const { score, components } = calcOpportunityScore(i, objective);
  const state = calcDemandState(i);
  let decision = 'NO_ACTION';

  if (blockers.includes('commercial_unsafe')) {
    decision = 'NEEDS_RESTAURANT_APPROVAL';
  } else if (blockers.includes('critical_data_missing')) {
    decision = 'NEEDS_HUMAN_REVIEW';
  } else if (blockers.length > 0) {
    decision = 'NO_ACTION';
  } else if (state === 'OVERLOADED' || state === 'BLOCKED') {
    decision = 'NO_ACTION';
  } else {
    const t = DECISION_THRESHOLDS;
    if (score <= t.NO_ACTION_MAX) decision = 'NO_ACTION';
    else if (score <= t.WATCH_MAX) decision = 'WATCH';
    else if (score <= t.PREPARE_MAX) decision = 'PREPARE';
    else if (score >= t.SCHEDULE_ACT_MIN)
      decision = i.urgency_score >= t.ACT_NOW_URGENCY ? 'ACT_NOW' : 'SCHEDULE';
  }

  // Learning-mode exploration promotion: a new/low-data restaurant that
  // declared a weak period with positive safe capacity should run a small
  // EXPLORE experiment (PREPARE) rather than merely WATCH, provided the score
  // is a genuine near-PREPARE WATCH (not a deep NO_ACTION).
  if (
    LEARNING_MODE_PROMOTION.enabled &&
    i.learning_mode &&
    decision === 'WATCH' &&
    blockers.length === 0 &&
    calcDemandGap(i) > 0 &&
    (i.audience_size || 0) > 0 &&
    score >= LEARNING_MODE_PROMOTION.min_score
  ) {
    decision = 'PREPARE';
  }

  // Future opportunity: a SCHEDULE/ACT_NOW that hasn't started yet is a PREPARE now.
  if (upcoming && (decision === 'SCHEDULE' || decision === 'ACT_NOW')) decision = 'PREPARE';
  return { decision, blockers, score, components, state, objective };
}

// ============================================================================
// STRATEGY V2 — objective (WHY) separated from mechanism (HOW).
// The objective is chosen from business intent; the mechanism is chosen from
// the minimum-intervention principle (least costly sufficient intervention).
// ============================================================================
export function recommendObjective(i: DecisionInputs, decision: string): string {
  if (['NO_ACTION', 'NEEDS_HUMAN_REVIEW', 'NEEDS_RESTAURANT_APPROVAL'].includes(decision)) return '';
  if (i.surplus_qty != null) return 'SURPLUS';
  const seg = i.audience_segment;
  const cann = cannibalizationLabel(i.cannibalization_score);
  // high cannibalization on repeat customers -> strengthen/loyalty, not acquisition
  if (cann === 'HIGH' && seg === 'REPEAT_CUSTOMER') return 'PRODUCT_STRENGTHENING';
  if (seg === 'LAPSED_30' || seg === 'LAPSED_60') return 'REACTIVATION';
  if (seg === 'POINTS_ENGAGED') return 'LOYALTY';
  if (seg === 'HIGH_INTENT_NO_PURCHASE') return 'CONVERSION_RECOVERY';
  if (seg === 'NEW_TO_RESTAURANT') return 'CUSTOMER_ACQUISITION';
  if (seg === 'FAMILY' || seg === 'HIGH_AOV') return 'AOV_GROWTH';
  // HEALTHY state with capacity -> strategic demand (loyalty) over recovery
  if (calcDemandState(i) === 'HEALTHY') return 'LOYALTY';
  return 'DEMAND_RECOVERY';
}

// Candidate mechanisms for an objective, in least-cost order.
// The engine then scores each by fit + cost and returns up to 3.
export function candidateMechanisms(objective: string): string[] {
  switch (objective) {
    case 'CUSTOMER_ACQUISITION': return ['VALUE_ADD', 'MIX_VALUE', 'FIRST_TRIAL'];
    case 'REACTIVATION': return ['PERSONALIZED_VALUE', 'VALUE_ADD', 'MIX_VALUE'];
    case 'AOV_GROWTH': return ['PLUS_UPSELL', 'VALUE_ADD', 'MIX_VALUE'];
    case 'SURPLUS': return ['TIME_AND_QUANTITY', 'LIMITED_QUANTITY', 'VALUE_ADD'];
    case 'LOYALTY': return ['POINT_LOCKED', 'VALUE_ADD', 'NO_DISCOUNT'];
    case 'CONVERSION_RECOVERY': return ['VALUE_ADD', 'MIX_VALUE', 'LIMITED_QUANTITY'];
    case 'PRODUCT_STRENGTHENING': return ['NO_DISCOUNT', 'VALUE_ADD', 'POINT_LOCKED'];
    case 'DEMAND_RECOVERY': return ['LIMITED_QUANTITY', 'VALUE_ADD', 'MIX_VALUE'];
    default: return ['VALUE_ADD', 'MIX_VALUE', 'NO_DISCOUNT'];
  }
}

// Mechanism -> recommended variant (classic | mix | plus)
export function mechanismVariant(mechanism: string): string {
  switch (mechanism) {
    case 'PLUS_UPSELL': return 'plus';
    case 'FIRST_TRIAL':
    case 'MIX_VALUE':
    case 'TIME_AND_QUANTITY': return 'mix';
    case 'PERSONALIZED_VALUE':
    case 'POINT_LOCKED':
    case 'NO_DISCOUNT': return 'mix';
    default: return 'classic';
  }
}

// ---- Intervention cost score (0 = free, 1 = expensive) ----
export function calcInterventionCost(i: DecisionInputs, mechanism: string): number {
  const c = INTERVENTION_COST;
  const base = c.mechanism_base[mechanism] ?? 0.5;
  const normal = Number(i.normal_price || 0);
  const customer = Number(i.customer_price || 0);
  const discountDepth = normal > 0 ? clamp((normal - customer) / normal) : 0;
  const tamamShare = normal > customer ? clamp(((i.tamam_contribution || 0)) / Math.max(1, normal - customer)) : 0;
  const pointsCost = clamp((i.unlock_points || 0) / 100);
  const opsComplexity = (mechanism === 'LIMITED_QUANTITY' || mechanism === 'TIME_AND_QUANTITY') ? 1 : 0;
  const cost = clamp(
    base +
    c.discount_depth_weight * discountDepth +
    c.tamam_contribution_weight * tamamShare +
    c.points_cost_weight * pointsCost +
    c.operational_complexity_weight * opsComplexity,
  );
  return Math.round(cost * 100) / 100;
}

export function costLabel(cost: number): string {
  if (cost <= 0.33) return 'low';
  if (cost <= 0.6) return 'medium';
  return 'high';
}

// ---- Expected incremental value (ESTIMATE, not causal) ----
export function calcExpectedIncrementalValue(i: DecisionInputs, mechanism: string, quota: number): {
  orders: number; revenue: number; tamam_cost: number; restaurant_settlement: number;
} {
  const conv = EXPECTED_VALUE.conversion_rate[mechanism] ?? 0.1;
  const intentMult = 0.7 + clamp(i.audience_intent_score || 0) * 0.6; // 0.7..1.3
  const orders = Math.max(0, Math.round(quota * conv * intentMult * 10) / 10);
  const normal = Number(i.normal_price || 0);
  const customer = Number(i.customer_price || normal) || normal;
  const revenue = Math.round(orders * customer * 100) / 100;
  const tamamCost = Math.round(orders * Number(i.tamam_contribution || 0) * 100) / 100;
  const restaurantSettlement = Math.round(orders * Number(i.restaurant_contribution || (customer - tamamCost)) * 100) / 100;
  return { orders, revenue, tamam_cost: tamamCost, restaurant_settlement: restaurantSettlement };
}

// ---- Strategy comparison: up to 3 candidate mechanisms ranked by fit - cost ----
export function compareStrategies(i: DecisionInputs, objective: string, decision: string): any[] {
  if (!objective) return [];
  const cands = candidateMechanisms(objective);
  const gap = calcDemandGap(i);
  const out: any[] = [];
  for (const m of cands) {
    // fit score: how well the mechanism matches the situation (0-100)
    let fit = 60;
    if (m === 'TIME_AND_QUANTITY' && i.surplus_qty != null) fit = 92;
    else if (m === 'PERSONALIZED_VALUE' && i.audience_size <= 1) fit = 90;
    else if (m === 'POINT_LOCKED' && i.audience_segment === 'POINTS_ENGAGED') fit = 88;
    else if (m === 'FIRST_TRIAL' && i.audience_segment === 'NEW_TO_RESTAURANT') fit = 85;
    else if (m === 'NO_DISCOUNT' && cannibalizationLabel(i.cannibalization_score) === 'HIGH') fit = 80;
    else if (m === 'VALUE_ADD') fit = 70;
    // penalize acquisition mechanisms under high cannibalization
    if (cannibalizationLabel(i.cannibalization_score) === 'HIGH' && ['FIRST_TRIAL', 'DIRECT_PRICE', 'MIX_VALUE'].includes(m)) fit -= 30;
    // reduce fit if commercial unsafe (only non-discount alternatives stay)
    if (!i.commercial_safe && ['DIRECT_PRICE', 'FIRST_TRIAL', 'MIX_VALUE', 'LIMITED_QUANTITY'].includes(m)) fit -= 40;
    const cost = calcInterventionCost(i, m);
    const netScore = Math.max(0, Math.min(100, Math.round(fit - cost * 25)));
    const variant = mechanismVariant(m);
    // quota for this mechanism
    const safeAdditional = calcSafeAdditionalCapacity(i);
    let q = Math.min(gap, safeAdditional, i.audience_size || 0);
    if (i.learning_mode) q = Math.min(q, LEARNING_MODE.quota_cap);
    if (m === 'PERSONALIZED_VALUE') q = Math.min(q, 1); // 1:1
    q = Math.max(0, Math.floor(q));
    const ev = calcExpectedIncrementalValue(i, m, q);
    out.push({
      mechanism: m, objective, variant,
      score: netScore, cost, cost_label: costLabel(cost),
      quota: q,
      expected_incremental_orders: ev.orders,
      expected_incremental_revenue: ev.revenue,
      expected_tamam_contribution_cost: ev.tamam_cost,
      expected_restaurant_settlement: ev.restaurant_settlement,
    });
  }
  out.sort((a, b) => b.score - a.score || a.cost - b.cost);
  return out.slice(0, STRATEGY_COMPARISON.max_alternatives);
}

// Back-compat: single recommended strategy (top alternative) + objective mapping.
export function recommendStrategy(i: DecisionInputs, decision: string): {
  objective: string; strategy: string; variant: string;
} {
  const objective = recommendObjective(i, decision);
  if (!objective) return { objective: '', strategy: '', variant: '' };
  const alts = compareStrategies(i, objective, decision);
  const top = alts[0];
  if (!top) return { objective: OBJECTIVE_TO_CAMPAIGN[objective] || '', strategy: '', variant: '' };
  return { objective: OBJECTIVE_TO_CAMPAIGN[objective] || '', strategy: top.mechanism, variant: top.variant };
}

// ---- Quota: never above safe additional capacity / gap / audience / learning cap ----
export function recommendQuota(i: DecisionInputs, decision: string, mechanism?: string): { quota: number; explore_exploit: string } {
  if (['NO_ACTION', 'NEEDS_HUMAN_REVIEW', 'NEEDS_RESTAURANT_APPROVAL', 'WATCH'].includes(decision))
    return { quota: 0, explore_exploit: 'EXPLORE' };
  const safeAdditional = calcSafeAdditionalCapacity(i);
  const gap = calcDemandGap(i);
  let quota = Math.min(gap, safeAdditional, i.audience_size || 0);
  let mode = 'EXPLOIT';
  if (i.learning_mode) { quota = Math.min(quota, LEARNING_MODE.quota_cap); mode = 'EXPLORE'; }
  else if ((i.data_confidence || 0) < 0.6) mode = 'EXPLORE';
  if (mechanism === 'PERSONALIZED_VALUE') quota = Math.min(quota, 1); // 1:1 reactivation
  return { quota: Math.max(0, Math.floor(quota)), explore_exploit: mode };
}

// ---- Map decision -> EXISTING Opportunity.opportunity_type (no new enum) ----
export function mapDecisionToOpportunityType(i: DecisionInputs, objectiveCampaign: string): string {
  if (i.surplus_qty != null || objectiveCampaign === 'SURPLUS') return 'surplus';
  if (objectiveCampaign === 'NEW_CUSTOMERS') return 'new_customers';
  if (objectiveCampaign === 'REACTIVATION') return 'reactivation';
  if (objectiveCampaign === 'IMMEDIATE_DEMAND') return 'immediate_demand';
  if (objectiveCampaign === 'INCREASE_AOV') return 'increase_aov';
  if (objectiveCampaign === 'LOYALTY_ENGAGEMENT') return 'loyalty_engagement';
  if (objectiveCampaign === 'CONVERSION_RECOVERY') return 'conversion_recovery';
  if (objectiveCampaign === 'STRENGTHEN_ITEM') return 'strengthen_item';
  return 'low_demand';
}

// ---- Human explanations (internal full reasoning / partner Arabic no raw data) ----
export function generateExplanation(
  i: DecisionInputs, decision: string, rec: { objective: string; strategy: string; variant: string },
  quota: number, scoreData: { score: number; components: any },
): { internal: string; partner: string } {
  const gap = calcDemandGap(i);
  const safeAdd = calcSafeAdditionalCapacity(i);
  const target = i.surplus_qty != null ? i.surplus_qty : i.safe_operational_target;
  const cann = cannibalizationLabel(i.cannibalization_score);

  const internal =
    `Window state: ${calcDemandState(i)}. ` +
    `Safe operational target ${target} | baseline ${i.baseline_orders} | projected natural ${i.projected_natural_orders} | existing commitment ${i.existing_campaign_commitment} | buffer ${SAFETY.buffer}. ` +
    `Safe additional capacity ${safeAdd} | demand gap ${gap}. ` +
    `Audience ${i.audience_segment} (${i.audience_size}, intent ${round(i.audience_intent_score)}). ` +
    `Cannibalization ${cann} (${round(i.cannibalization_score)}) | fatigue ${round(i.fatigue_score)} | operational risk ${round(i.operational_risk)} | saturation ${round(i.campaign_saturation)}. ` +
    `Commercial ${i.commercial_safe ? 'safe' : 'unsafe'} (${round(i.commercial_score)}). ` +
    `Priority ${i.product_priority} (${round(i.restaurant_priority_score)}) | urgency ${round(i.urgency_score)} | confidence ${round(i.data_confidence)}. ` +
    `Capacity source ${i.capacity_source || 'unknown'}. ` +
    `Opportunity score ${scoreData.score}. ` +
    `Blockers: ${(hardBlockers(i).length ? hardBlockers(i).join(', ') : 'none')}. ` +
    `Decision ${decision}` + (rec.strategy ? ` -> ${rec.objective} / ${rec.strategy} / ${rec.variant}, quota ${quota}` : '');

  // Partner-facing: Arabic, no raw scores / user ids / segment SQL.
  let partner = '';
  if (decision === 'NO_ACTION') {
    if (hardBlockers(i).includes('restaurant_pressure')) partner = 'المطعم عليه ضغط هلا، ما بنوصي نزيد طلبات.';
    else if (hardBlockers(i).includes('existing_campaign_fills_gap') || hardBlockers(i).includes('campaign_saturation'))
      partner = 'في حملة شغالة هلا بتسكر الفجوة، ما محتاجين حملة إضافية.';
    else if (cann === 'HIGH') partner = 'الزبائن المستهدفين غالباً رح يشتروا بدون حافز، فما بدنا نحرق سعر.';
    else if (calcDemandState(i) === 'HEALTHY') partner = 'الطلب الطبيعي ممتاز بهالفترة، ما محتاجين تدخل.';
    else if (!i.commercial_safe) partner = 'ما في مساحة تجارية آمنة لهالعرض هلا.';
    else partner = 'ما في فرصة تدخل آمنة بهاللحظة.';
  } else if (decision === 'NEEDS_RESTAURANT_APPROVAL') {
    partner = 'في فرصة بس التجاري لازم موافقتك قبل ما نفعّل (السعر المقترح تحت الحد).';
  } else if (decision === 'NEEDS_HUMAN_REVIEW') {
    partner = 'محتاجين نراجع البيانات قبل ما نقرر.';
  } else {
    const cap = safeAdd > 0 ? `عندك قدرة تستقبل لحد ${Math.floor(safeAdd)} طلب` : 'عندك قدرة تستقبل طلبات';
    const aud = i.audience_segment === 'NEW_TO_RESTAURANT' ? 'في جمهور مهتم ولسه ما جرّب مطعمك'
      : i.audience_segment === 'LAPSED_30' || i.audience_segment === 'LAPSED_60' ? 'في زباين رجعوا من فترة'
      : i.audience_segment === 'POINTS_ENGAGED' ? 'في جمهور مفعّل بالنقاط'
      : i.audience_segment === 'HIGH_INTENT_NO_PURCHASE' ? 'في جمهور نية عالية ما طلبت لسا'
      : 'في جمهور مناسب';
    const strat = rec.strategy === 'FIRST_TRIAL' ? `اقتراح TAMAM: ميكس لتجربة أولى، لحد ${quota} طلب`
      : rec.strategy === 'TIME_AND_QUANTITY' ? `اقتراح TAMAM: عرض بوقت وكمية، لحد ${quota} وحدة`
      : rec.strategy === 'PERSONALIZED_VALUE' ? `اقتراح TAMAM: قيمة مضافة شخصية، لزبون واحد`
      : rec.strategy === 'POINT_LOCKED' ? `اقتراح TAMAM: عرض بالنقاط، لحد ${quota} طلب`
      : rec.strategy === 'VALUE_ADD' ? `اقتراح TAMAM: قيمة مضافة بدون حرق سعر، لحد ${quota} طلب`
      : rec.strategy === 'MIX_VALUE' ? `اقتراح TAMAM: ميكس بقيمة، لحد ${quota} طلب`
      : rec.strategy === 'NO_DISCOUNT' ? `اقتراح TAMAM: إبراز الوجبة بدون خصم`
      : rec.strategy === 'PLUS_UPSELL' ? `اقتراح TAMAM: بلس لرفع السلة، لحد ${quota} طلب`
      : `اقتراح TAMAM: ${rec.strategy || 'تدخل محسوب'}، لحد ${quota} طلب`;
    partner = `${cap}. ${aud}. ${strat}.`;
  }

  return { internal, partner };
}

// ===========================================================================
// applyVerticalAdvisory — the VERTICAL INTELLIGENCE → DEMAND DECISION bridge.
// Pure. Takes the authoritative decision + recommended strategy/alternatives
// (already computed from demand/capacity/commercial reality) and the advisory
// vertical_strategy_context, and adjusts STRATEGY RANKING only.
//
// It NEVER changes the decision (NO_ACTION stays NO_ACTION), NEVER bypasses
// demand_gap / safe capacity / operational pressure / commercial safety /
// fatigue / cannibalization / existing commitments. It answers only:
// "given DemandDecision decided to act, which mechanism does vertical
// knowledge favor?" — candidates, not commands. [Vertical→Demand Bridge §5,6]
// ===========================================================================
export function applyVerticalAdvisory(
  i: DecisionInputs, decision: string,
  rec: { objective: string; strategy: string; variant: string },
  alternatives: any[],
  vctx: any | null,
  internalObjective: string,
): { rec: { objective: string; strategy: string; variant: string }; alternatives: any[]; note: string; note_ar: string } {
  if (!vctx || !vctx.candidates || !vctx.candidates.length) {
    return { rec, alternatives, note: "no_vertical_context", note_ar: "" };
  }

  // Vertical matched but intervention NOT justified — DemandDecision authority wins.
  // [§6, §17] NO_ACTION must win even with high vertical confidence.
  if (["NO_ACTION", "NEEDS_HUMAN_REVIEW", "NEEDS_RESTAURANT_APPROVAL", "WATCH"].includes(decision)) {
    return {
      rec, alternatives,
      note: "vertical_matched_intervention_not_justified",
      note_ar: "الـPlaybook مناسب نظرياً، بس المطعم ما بحاجة طلب إضافي بالفترة الحالية.",
    };
  }

  // Surplus is a real-time restaurant fact — stronger than generic vertical strategy. [§9]
  if (i.surplus_qty != null) {
    return { rec, alternatives, note: "surplus_overrides_vertical", note_ar: "فائض فعلي بيتجاوز playbook العام." };
  }

  const out = alternatives.map((a) => ({ ...a }));
  let note = "vertical_advisory_applied";
  let noteAr = "";

  // Restaurant override: highest strategy preference BELOW safety. [§11]
  // Compatible → rank 1. Incompatible with the actual objective → reject with reason.
  const overrideMech = vctx._override_mechanism || null;
  if (overrideMech) {
    const compatibleMechs = candidateMechanisms(internalObjective);
    if (compatibleMechs.includes(overrideMech)) {
      boostMech(out, overrideMech, 100);
      note = "restaurant_override_preferred";
      noteAr = "تجاوز استراتيجي مفعّل ومتوافق — تم تفضيله.";
      // fall through: learning + candidate alignment still applied below
    } else {
      note = "restaurant_override_considered_but_not_fit";
      noteAr = "التجاوز الاستراتيجي ما بيناسب الهدف هلا — تم رفضه.";
    }
  }

  // Restaurant-specific reliable learning > generic playbook (never absolute). [§14]
  const learning = vctx.restaurant_specific_learning;
  if (learning && learning.objective === rec.objective && learning.mechanism) {
    boostMech(out, learning.mechanism, 20);
    note = "restaurant_specific_learning_favored";
    noteAr = "تعلم سابق موثوق لهاد المطعم بفضّل آلية معينة.";
  }

  // Vertical candidate alignment: candidates matching the chosen objective get a fit bonus. [§7]
  for (const c of vctx.candidates) {
    if (c.objective === rec.objective && c.mechanism) boostMech(out, c.mechanism, 6);
  }

  out.sort((a, b) => (b.score - a.score) || (a.cost - b.cost));
  const top = out[0];
  const newRec = top ? { objective: rec.objective, strategy: top.mechanism, variant: top.variant } : rec;
  return { rec: newRec, alternatives: out, note, note_ar: noteAr };
}

function boostMech(alts: any[], mechanism: string, delta: number) {
  const a = alts.find((x) => x.mechanism === mechanism);
  if (a) a.score = Math.min(100, Math.max(0, (a.score || 0) + delta));
}