// ============================================================================
// demandDecisionLogic — PURE deterministic decision calculations.
// No SDK, no IO, no black-box AI. Every function is explainable.
// Consumes a normalized `inputs` object (built by the backend function from
// real data OR from a demo scenario config) + the central config weights.
// ============================================================================

import {
  SCORE_WEIGHTS, PENALTY_WEIGHTS, DECISION_THRESHOLDS, SAFETY,
  CANNIBALIZATION, LEARNING_MODE,
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
  // demand
  baseline_orders: number;
  projected_natural_orders: number;
  safe_capacity: number;
  existing_campaign_commitment: number;
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
}

function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

// ---- Safe additional capacity: what the restaurant can absorb safely ----
export function calcSafeAdditionalCapacity(i: DecisionInputs): number {
  if (i.pressure_active || i.traffic_light === 'RED') return 0;
  const cap = i.surplus_qty != null ? i.surplus_qty : i.safe_capacity;
  const add = cap - i.projected_natural_orders - i.existing_campaign_commitment - SAFETY.buffer;
  return Math.max(0, Math.round(add * 10) / 10);
}

// ---- Demand gap: safe target - projected - committed (never < 0) ----
export function calcDemandGap(i: DecisionInputs): number {
  const gap = i.safe_capacity - i.projected_natural_orders - i.existing_campaign_commitment;
  return Math.max(0, Math.round(gap * 10) / 10);
}

// ---- Demand state (internal TAMAM, NOT the partner traffic light) ----
export function calcDemandState(i: DecisionInputs): string {
  if (!i.restaurant_open || i.restaurant_status === 'temporarily_unavailable' || i.traffic_light === 'BLOCKED')
    return 'BLOCKED';
  if (i.pressure_active || i.traffic_light === 'RED' || i.restaurant_status === 'busy')
    return 'OVERLOADED';
  if (i.safe_capacity <= 0) return 'UNKNOWN';
  const gap = calcDemandGap(i);
  if (gap <= 0) return 'HEALTHY';
  const ratio = gap / i.safe_capacity;
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
  const sat = i.safe_capacity > 0 ? i.existing_campaign_commitment / i.safe_capacity : 0;
  if (i.safe_capacity > 0 && sat >= SAFETY.saturation_block) b.push('campaign_saturation');
  const gap = calcDemandGap(i);
  if (gap <= 0 && i.existing_campaign_commitment > 0) b.push('existing_campaign_fills_gap');
  if ((i.data_confidence ?? 0) < 0.2) b.push('critical_data_missing');
  return b;
}

// ---- Opportunity score: explainable, component-based ----
export function calcOpportunityScore(i: DecisionInputs): { score: number; components: any } {
  const safeAdditional = calcSafeAdditionalCapacity(i);
  const gap = calcDemandGap(i);
  const demandNeed = i.safe_capacity > 0 ? clamp(gap / i.safe_capacity) : 0;
  const capacityFit = i.safe_capacity > 0 ? clamp(safeAdditional / i.safe_capacity) : 0;
  const audienceIntent = clamp(i.audience_intent_score || 0);
  const commercialSafety = clamp(i.commercial_score || 0);
  const priorityScore = clamp(i.restaurant_priority_score || 0);
  const urgency = clamp(i.urgency_score || 0);
  const dataConfidence = clamp(i.data_confidence || 0);
  const cannibalization = clamp(i.cannibalization_score || 0);
  const fatigue = clamp(i.fatigue_score || 0);
  const operationalRisk = clamp(i.operational_risk || 0);
  const saturation = clamp(i.campaign_saturation || 0);

  const w = SCORE_WEIGHTS;
  const pw = PENALTY_WEIGHTS;
  const positive =
    w.demand_need * demandNeed +
    w.capacity_fit * capacityFit +
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
      demandNeed: round(demandNeed), capacityFit: round(capacityFit),
      audienceIntent: round(audienceIntent), commercialSafety: round(commercialSafety),
      priorityScore: round(priorityScore), urgency: round(urgency),
      dataConfidence: round(dataConfidence),
      cannibalization: round(cannibalization), fatigue: round(fatigue),
      operationalRisk: round(operationalRisk), saturation: round(saturation),
      positive: round(positive), negative: round(negative),
      demand_gap: gap, safe_additional: safeAdditional,
    },
  };
}

// ---- Decision: blockers first, then score bands, then state override ----
export function decideDemandAction(i: DecisionInputs, upcoming: boolean): {
  decision: string; blockers: string[]; score: number; components: any; state: string;
} {
  const blockers = hardBlockers(i);
  const { score, components } = calcOpportunityScore(i);
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

  // Future opportunity: a SCHEDULE/ACT_NOW that hasn't started yet is a PREPARE now.
  if (upcoming && (decision === 'SCHEDULE' || decision === 'ACT_NOW')) decision = 'PREPARE';
  return { decision, blockers, score, components, state };
}

// ---- Strategy recommendation (rule-based, not deepest discount) ----
export function recommendStrategy(i: DecisionInputs, decision: string): {
  objective: string; strategy: string; variant: string;
} {
  if (['NO_ACTION', 'NEEDS_HUMAN_REVIEW', 'NEEDS_RESTAURANT_APPROVAL'].includes(decision))
    return { objective: '', strategy: '', variant: '' };
  const seg = i.audience_segment;
  const cann = cannibalizationLabel(i.cannibalization_score);
  if (i.surplus_qty != null) return { objective: 'SURPLUS', strategy: 'TIME_AND_QUANTITY', variant: 'mix' };
  if (cann === 'HIGH') return { objective: 'STRENGTHEN_ITEM', strategy: 'NO_DISCOUNT', variant: 'classic' };
  if (seg === 'LAPSED_30' || seg === 'LAPSED_60') return { objective: 'REACTIVATION', strategy: 'PERSONALIZED_VALUE', variant: 'mix' };
  if (seg === 'POINTS_ENGAGED') return { objective: 'LOYALTY_ENGAGEMENT', strategy: 'POINT_LOCKED', variant: 'mix' };
  if (seg === 'HIGH_INTENT_NO_PURCHASE') return { objective: 'CONVERSION_RECOVERY', strategy: 'VALUE_ADD', variant: 'classic' };
  if (seg === 'NEW_TO_RESTAURANT') return { objective: 'NEW_CUSTOMERS', strategy: 'FIRST_TRIAL', variant: 'mix' };
  if (seg === 'FAMILY' || seg === 'HIGH_AOV') return { objective: 'INCREASE_AOV', strategy: 'PLUS_UPSELL', variant: 'plus' };
  return { objective: 'NEW_CUSTOMERS', strategy: 'VALUE_ADD', variant: 'mix' };
}

// ---- Quota: never above safe additional capacity / gap / audience / learning cap ----
export function recommendQuota(i: DecisionInputs, decision: string): { quota: number; explore_exploit: string } {
  if (['NO_ACTION', 'NEEDS_HUMAN_REVIEW', 'NEEDS_RESTAURANT_APPROVAL', 'WATCH'].includes(decision))
    return { quota: 0, explore_exploit: 'EXPLORE' };
  const safeAdditional = calcSafeAdditionalCapacity(i);
  const gap = calcDemandGap(i);
  let quota = Math.min(gap, safeAdditional, i.audience_size || 0);
  let mode = 'EXPLOIT';
  if (i.learning_mode) { quota = Math.min(quota, LEARNING_MODE.quota_cap); mode = 'EXPLORE'; }
  else if ((i.data_confidence || 0) < 0.6) mode = 'EXPLORE';
  return { quota: Math.max(0, Math.floor(quota)), explore_exploit: mode };
}

// ---- Map decision -> EXISTING Opportunity.opportunity_type (no new enum) ----
export function mapDecisionToOpportunityType(i: DecisionInputs, objective: string): string {
  if (i.surplus_qty != null || objective === 'SURPLUS') return 'surplus';
  if (objective === 'NEW_CUSTOMERS') return 'new_customers';
  if (objective === 'REACTIVATION') return 'reactivation';
  if (objective === 'IMMEDIATE_DEMAND') return 'immediate_demand';
  if (objective === 'INCREASE_AOV') return 'increase_aov';
  if (objective === 'LOYALTY_ENGAGEMENT') return 'loyalty_engagement';
  if (objective === 'CONVERSION_RECOVERY') return 'conversion_recovery';
  if (objective === 'STRENGTHEN_ITEM') return 'strengthen_item';
  return 'low_demand';
}

// ---- Human explanations (internal full reasoning / partner Arabic no raw data) ----
export function generateExplanation(
  i: DecisionInputs, decision: string, rec: { objective: string; strategy: string; variant: string },
  quota: number, scoreData: { score: number; components: any },
): { internal: string; partner: string } {
  const gap = calcDemandGap(i);
  const safeAdd = calcSafeAdditionalCapacity(i);
  const cann = cannibalizationLabel(i.cannibalization_score);

  const internal =
    `Window state: ${calcDemandState(i)}. ` +
    `Baseline ${i.baseline_orders} | projected natural ${i.projected_natural_orders} | safe capacity ${i.safe_capacity} | existing commitment ${i.existing_campaign_commitment}. ` +
    `Demand gap ${gap} | safe additional ${safeAdd}. ` +
    `Audience ${i.audience_segment} (${i.audience_size}, intent ${round(i.audience_intent_score)}). ` +
    `Cannibalization ${cann} (${round(i.cannibalization_score)}) | fatigue ${round(i.fatigue_score)} | operational risk ${round(i.operational_risk)} | saturation ${round(i.campaign_saturation)}. ` +
    `Commercial ${i.commercial_safe ? 'safe' : 'unsafe'} (${round(i.commercial_score)}). ` +
    `Priority ${i.product_priority} (${round(i.restaurant_priority_score)}) | urgency ${round(i.urgency_score)} | confidence ${round(i.data_confidence)}. ` +
    `Opportunity score ${scoreData.score}. ` +
    `Blockers: ${(hardBlockers(i).length ? hardBlockers(i).join(', ') : 'none')}. ` +
    `Decision ${decision}` + (rec.strategy ? ` -> ${rec.objective} / ${rec.strategy} / ${rec.variant}, quota ${quota}` : '');

  // Partner-facing: Arabic, no raw scores / user ids / segment SQL.
  let partner = '';
  if (decision === 'NO_ACTION') {
    if (hardBlockers(i).includes('restaurant_pressure')) partner = 'المطعم عليه ضغط هلا، ما بنوصي نزيد طلبات.';
    else if (hardBlockers(i).includes('existing_campaign_fills_gap') || hardBlockers(i).includes('campaign_saturation'))
      partner = 'في حملة شغالة هلا بتسكر الفجوة، ما محتاجين حملة إضافية.';
    else if (calcDemandState(i) === 'HEALTHY') partner = 'الطلب الطبيعي ممتاز بهالفترة، ما محتاجين تدخل.';
    else partner = 'ما في فرصة تدخل آمنة بهاللحظة.';
  } else if (decision === 'NEEDS_RESTAURANT_APPROVAL') {
    partner = 'في فرصة بس التجاري لازم موافقتك قبل ما نفعّل.';
  } else if (decision === 'NEEDS_HUMAN_REVIEW') {
    partner = 'محتاجين نراجع البيانات قبل ما نقرر.';
  } else {
    const win = `الفترة ${fmtWin(i)}`;
    const cap = safeAdd > 0 ? `عندك قدرة تستقبل لحد ${Math.floor(safeAdd)} طلب` : 'عندك قدرة تستقبل طلبات';
    const aud = i.audience_segment === 'NEW_TO_RESTAURANT' ? 'في جمهور مهتم ولسه ما جرّب مطعمك'
      : i.audience_segment === 'LAPSED_30' || i.audience_segment === 'LAPSED_60' ? 'في زباين رجعوا من فترة'
      : i.audience_segment === 'POINTS_ENGAGED' ? 'في جمهور مفعّل بالنقاط'
      : 'في جمهور مناسب';
    const strat = rec.strategy === 'FIRST_TRIAL' ? `اقتراح TAMAM: ميكس لتجربة أولى، لحد ${quota} طلب`
      : rec.strategy === 'TIME_AND_QUANTITY' ? `اقتراح TAMAM: عرض بوقت وكمية، لحد ${quota} وحدة`
      : rec.strategy === 'PERSONALIZED_VALUE' ? `اقتراح TAMAM: قيمة مضافة شخصية، لحد ${quota} طلب`
      : rec.strategy === 'POINT_LOCKED' ? `اقتراح TAMAM: عرض بالنقاط، لحد ${quota} طلب`
      : rec.strategy === 'VALUE_ADD' ? `اقتراح TAMAM: قيمة مضافة، لحد ${quota} طلب`
      : rec.strategy === 'PLUS_UPSELL' ? `اقتراح TAMAM: بلس لرفع السلة، لحد ${quota} طلب`
      : `اقتراح TAMAM: ${rec.strategy || 'تدخل محسوب'}، لحد ${quota} طلب`;
    partner = `${win}. ${cap}. ${aud}. ${strat}.`;
  }

  return { internal, partner };
}

function fmtWin(i: DecisionInputs): string {
  return 'هادي شوي';
}
function round(x: number): number {
  return Math.round(x * 100) / 100;
}