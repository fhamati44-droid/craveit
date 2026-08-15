// ============================================================================
// demandDecisionConfig — CENTRAL configuration for the Demand Decision Engine.
// All score weights, decision thresholds, confidence rules, learning-mode caps,
// safety buffers and demo scenarios live HERE. Never scatter magic numbers.
// ============================================================================

// ---- Opportunity score weights (positive factors, sum ~ 1.0) ----
export const SCORE_WEIGHTS = {
  demand_need: 0.20,
  capacity_fit: 0.16,
  audience_intent: 0.13,
  commercial_safety: 0.14,
  restaurant_priority: 0.09,
  urgency: 0.10,
  data_confidence: 0.18,
} as const;

// ---- Penalty weights (negative factors) ----
export const PENALTY_WEIGHTS = {
  cannibalization: 0.18,
  fatigue: 0.10,
  operational_risk: 0.18,
  campaign_saturation: 0.14,
} as const;

// ---- Decision thresholds (applied to 0-100 score) ----
export const DECISION_THRESHOLDS = {
  NO_ACTION_MAX: 39,        // 0-39  -> NO_ACTION
  WATCH_MAX: 59,            // 40-59 -> WATCH
  PREPARE_MAX: 74,          // 60-74 -> PREPARE
  SCHEDULE_ACT_MIN: 75,    // 75+   -> SCHEDULE / ACT_NOW
  ACT_NOW_URGENCY: 0.7,    // urgency >= this -> ACT_NOW, else SCHEDULE
} as const;

// ---- Data confidence rules ----
export const CONFIDENCE = {
  min_sample_size: 4,       // historical comparable windows needed for non-fallback baseline
  low_confidence_max: 0.45,
  ok_confidence_min: 0.6,
  critical_min: 0.2,        // below this -> NEEDS_HUMAN_REVIEW (critical data missing)
} as const;

// ---- Learning mode (new / low-data restaurants) ----
export const LEARNING_MODE = {
  quota_cap: 5,
  max_tamam_contribution: 4,
  min_completed_windows: 4,
  min_orders: 8,
} as const;

// ---- Safe capacity / saturation ----
export const SAFETY = {
  buffer: 2,                // orders kept as operational safety buffer
  default_safe_capacity: 20,
  saturation_block: 0.7,    // commitment/safe_capacity >= this blocks a new campaign
} as const;

// ---- Campaign fatigue ----
export const FATIGUE = {
  exposure_threshold: 3,    // impressions per audience member in window
  block_score: 0.6,         // fatigue score above this is a strong penalty
} as const;

// ---- Cannibalization bands ----
export const CANNIBALIZATION = {
  low_max: 0.25,
  medium_max: 0.55,
} as const;

// ---- Product priority -> 0-1 score ----
export const PRIORITY_SCORE: Record<string, number> = {
  STRENGTHEN: 1.0,
  SURPLUS: 0.9,
  TEMPORARY_OPPORTUNITY: 0.8,
  NEW_ITEM: 0.7,
  NORMAL: 0.6,
  AVOID_PROMOTION: 0.1,
};

export const DEMAND_STATES = ['NEEDS_DEMAND', 'HEALTHY', 'CAUTION', 'OVERLOADED', 'BLOCKED', 'UNKNOWN'] as const;
export const DECISIONS = ['NO_ACTION', 'WATCH', 'PREPARE', 'SCHEDULE', 'ACT_NOW', 'NEEDS_HUMAN_REVIEW', 'NEEDS_RESTAURANT_APPROVAL'] as const;

// ---- Strategy -> existing Campaign.objective enum ----
export const STRATEGY_OBJECTIVE: Record<string, string> = {
  FIRST_TRIAL: 'NEW_CUSTOMERS',
  VALUE_ADD: 'NEW_CUSTOMERS',
  MIX_PROMOTION: 'NEW_CUSTOMERS',
  PLUS_UPSELL: 'INCREASE_AOV',
  LIMITED_TIME: 'IMMEDIATE_DEMAND',
  LIMITED_QUANTITY: 'IMMEDIATE_DEMAND',
  TIME_AND_QUANTITY: 'SURPLUS',
  POINT_LOCKED: 'LOYALTY_ENGAGEMENT',
  REACTIVATION: 'REACTIVATION',
  PERSONALIZED_VALUE: 'REACTIVATION',
  SURPLUS: 'SURPLUS',
  NO_DISCOUNT: 'STRENGTHEN_ITEM',
};

// ---- Demo batch id (isolated from production analytics) ----
export const DEMO_BATCH = 'tamam-demand-decision-demo-v1';

// ============================================================================
// DEMO SCENARIOS — مطعم البرك التجريبي
// Simulated inputs so the Lab/checkpoint is deterministic WITHOUT touching
// real order/campaign data. Production evaluation (no scenario_key) reads real
// data instead. Each scenario is fully self-contained.
// ============================================================================
export const DEMO_SCENARIOS: any[] = [
  {
    key: 'A_weak_period',
    label: 'A — فترة هادية (الإثنين 15:00–17:00)',
    description: 'GREEN window, Shawarma STRENGTHEN, new-to-restaurant audience available, commercial safe.',
    day: 1, start: { h: 15, m: 0 }, end: { h: 17, m: 0 },
    inputs: {
      traffic_light: 'GREEN', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'STRENGTHEN', product_available: true, mapping_valid: true,
      baseline_orders: 7, projected_natural_orders: 5, safe_capacity: 20, existing_campaign_commitment: 0,
      audience_segment: 'NEW_TO_RESTAURANT', audience_size: 112, audience_intent_score: 0.8,
      cannibalization_score: 0.1, fatigue_score: 0.1, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.9, approval_required: false,
      restaurant_priority_score: 1.0, urgency_score: 0.5, data_confidence: 0.7,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
    },
    expected: ['PREPARE', 'SCHEDULE'],
    expected_strategy: ['FIRST_TRIAL', 'MIX_PROMOTION', 'VALUE_ADD'],
  },
  {
    key: 'B_busy_period',
    label: 'B — فترة ضغط (الجمعة 19:00)',
    description: 'RED / pressure, natural demand high, strong audience — TAMAM must NOT create demand.',
    day: 5, start: { h: 19, m: 0 }, end: { h: 21, m: 0 },
    inputs: {
      traffic_light: 'RED', restaurant_open: true, restaurant_status: 'busy', pressure_active: true,
      product_priority: 'NORMAL', product_available: true, mapping_valid: true,
      baseline_orders: 25, projected_natural_orders: 25, safe_capacity: 0, existing_campaign_commitment: 0,
      audience_segment: 'REPEAT_CUSTOMER', audience_size: 80, audience_intent_score: 0.9,
      cannibalization_score: 0.85, fatigue_score: 0.2, operational_risk: 0.9, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.9, approval_required: false,
      restaurant_priority_score: 0.6, urgency_score: 0.3, data_confidence: 0.7,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
    },
    expected: ['NO_ACTION'],
    expected_strategy: [],
  },
  {
    key: 'C_existing_fills_gap',
    label: 'C — حملة موجودة بتسكر الفجوة',
    description: 'Existing active campaign commitment already fills the safe demand gap — do not overlap.',
    day: 2, start: { h: 15, m: 0 }, end: { h: 17, m: 0 },
    inputs: {
      traffic_light: 'GREEN', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'STRENGTHEN', product_available: true, mapping_valid: true,
      baseline_orders: 5, projected_natural_orders: 5, safe_capacity: 15, existing_campaign_commitment: 10,
      audience_segment: 'NEW_TO_RESTAURANT', audience_size: 60, audience_intent_score: 0.6,
      cannibalization_score: 0.3, fatigue_score: 0.3, operational_risk: 0.1, campaign_saturation: 0.85,
      commercial_safe: true, commercial_score: 0.8, approval_required: false,
      restaurant_priority_score: 1.0, urgency_score: 0.3, data_confidence: 0.6,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
    },
    expected: ['NO_ACTION', 'WATCH'],
    expected_strategy: [],
  },
  {
    key: 'D_surplus',
    label: 'D — فائض كمية (عندي كمية، 15 وحدة لغاية 22:00)',
    description: 'Partner surplus signal — high urgency, limited quantity, time-bounded.',
    day: 3, start: { h: 18, m: 0 }, end: { h: 22, m: 0 },
    inputs: {
      traffic_light: 'YELLOW', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'SURPLUS', product_available: true, mapping_valid: true,
      baseline_orders: 8, projected_natural_orders: 0, safe_capacity: 15, existing_campaign_commitment: 0,
      audience_segment: 'public', audience_size: 150, audience_intent_score: 0.7,
      cannibalization_score: 0.2, fatigue_score: 0.1, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.85, approval_required: false,
      restaurant_priority_score: 0.9, urgency_score: 1.0, data_confidence: 0.7,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: 15,
    },
    expected: ['ACT_NOW'],
    expected_strategy: ['TIME_AND_QUANTITY'],
  },
];