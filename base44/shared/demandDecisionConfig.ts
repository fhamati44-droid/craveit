// ============================================================================
// demandDecisionConfig — CENTRAL configuration for the Demand Decision Engine.
// All score weights, decision thresholds, confidence rules, learning-mode caps,
// safety buffers, capacity model, intervention-cost weights, expected-value
// heuristics, strategy-comparison rules and demo scenarios live HERE.
// Never scatter magic numbers.
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
  default_safe_capacity: 20, // HEURISTIC fallback only (lowest confidence)
  saturation_block: 0.7,    // commitment / safe_operational_target >= this blocks a new campaign
} as const;

// ============================================================================
// CAPACITY MODEL (Milestone 2) — partner-owned + source priority.
// The engine resolves safe_operational_target using a strict priority order and
// records which source was used + a confidence that feeds data_confidence.
// ============================================================================
export const CAPACITY = {
  // source priority (1 = highest). First match wins.
  source_priority: [
    'realtime_restriction',   // pressure / closed / temp-unavailable -> cap 0
    'temporary_signal',       // surplus / sold_out signal quantity
    'time_specific',          // weak_period_additional / peak_period_additional by traffic light
    'restaurant_default',     // capacity_normal_additional_per_hour (partner-provided)
    'historical_inferred',    // inferred from delivered order history
    'heuristic_fallback',     // SAFETY.default_safe_capacity (lowest confidence)
  ],
  // confidence contribution by source (feeds data_confidence, blended)
  source_confidence: {
    realtime_restriction: 0.9,
    temporary_signal: 0.8,
    time_specific: 0.75,
    restaurant_default: 0.8,     // explicit partner setting -> high
    historical_inferred: 0.6,   // depends on sample (raised when sample large)
    heuristic_fallback: 0.3,    // lowest
  },
  // mapping partner answer -> capacity_normal_additional_per_hour
  partner_answer_to_capacity: {
    '5': 5, '10': 10, '15': 15, '20': 20, 'أكثر': 25, 'مش متأكد': null,
  },
  peak_multiplier: 0.5,   // peak_period_additional = normal * peak_multiplier (cap reduction)
  weak_multiplier: 1.0,   // weak period uses full normal capacity
} as const;

// ---- Campaign fatigue ----
export const FATIGUE = {
  exposure_threshold: 3,    // impressions per audience member in window
  block_score: 0.6,        // fatigue score above this is a strong penalty
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

// ---- Data source labels (trust/debugging) ----
export const DATA_SOURCES = ['ACTUAL', 'INFERRED', 'PARTNER_PROVIDED', 'HEURISTIC', 'DEMO_OVERRIDE'] as const;

// ============================================================================
// STRATEGY V2 (Milestone 2) — objective (WHY) separated from mechanism (HOW).
// Mechanisms are ranked by minimum-intervention principle (least costly first).
// ============================================================================
// Objectives (map to existing Campaign.objective enum)
export const OBJECTIVES = [
  'DEMAND_RECOVERY', 'CUSTOMER_ACQUISITION', 'REACTIVATION', 'AOV_GROWTH',
  'SURPLUS', 'LOYALTY', 'CONVERSION_RECOVERY', 'PRODUCT_STRENGTHENING',
] as const;

// Objective -> existing Campaign.objective enum
export const OBJECTIVE_TO_CAMPAIGN: Record<string, string> = {
  DEMAND_RECOVERY: 'IMMEDIATE_DEMAND',
  CUSTOMER_ACQUISITION: 'NEW_CUSTOMERS',
  REACTIVATION: 'REACTIVATION',
  AOV_GROWTH: 'INCREASE_AOV',
  SURPLUS: 'SURPLUS',
  LOYALTY: 'LOYALTY_ENGAGEMENT',
  CONVERSION_RECOVERY: 'CONVERSION_RECOVERY',
  PRODUCT_STRENGTHENING: 'STRENGTHEN_ITEM',
};

// Intervention mechanisms, ranked least-costly first (minimum intervention principle)
export const MECHANISMS = [
  'NO_DISCOUNT',        // highlight / strengthen, no price change
  'VALUE_ADD',          // extra item at same price
  'MIX_VALUE',          // mix bundle value
  'POINT_LOCKED',       // points-gated exclusive
  'LIMITED_QUANTITY',   // scarcity, small discount
  'FIRST_TRIAL',        // trial price for new customers
  'TIME_AND_QUANTITY', // time + qty bounded (surplus)
  'PERSONALIZED_VALUE', // 1:1 reactivation
  'PLUS_UPSELL',       // AOV growth
  'DIRECT_PRICE',       // direct discount (last resort)
] as const;

// Mechanism -> existing CampaignOffer.offer_type (for Phase 1 execution)
export const MECHANISM_TO_OFFER_TYPE: Record<string, string> = {
  NO_DISCOUNT: 'STANDARD_VALUE',
  VALUE_ADD: 'VALUE_ADD',
  MIX_VALUE: 'STANDARD_VALUE',
  POINT_LOCKED: 'POINT_LOCKED',
  LIMITED_QUANTITY: 'LIMITED_QUANTITY',
  FIRST_TRIAL: 'FIRST_TRIAL',
  TIME_AND_QUANTITY: 'TIME_AND_QUANTITY',
  PERSONALIZED_VALUE: 'REACTIVATION',
  PLUS_UPSELL: 'AOV_UPSELL',
  DIRECT_PRICE: 'DIRECT_PRICE',
};

// ---- Intervention cost weights (0 = free, 1 = expensive) ----
// Used to compare strategies: close the gap with minimum commercial cost.
export const INTERVENTION_COST = {
  mechanism_base: {
    NO_DISCOUNT: 0.05,
    VALUE_ADD: 0.15,
    MIX_VALUE: 0.25,
    POINT_LOCKED: 0.2,   // points cost (loyalty currency, not cash discount)
    LIMITED_QUANTITY: 0.35,
    FIRST_TRIAL: 0.4,
    TIME_AND_QUANTITY: 0.35,
    PERSONALIZED_VALUE: 0.3,
    PLUS_UPSELL: 0.2,
    DIRECT_PRICE: 0.7,
  },
  discount_depth_weight: 0.5,   // (normal - customer)/normal
  tamam_contribution_weight: 0.3, // tamam share of discount
  points_cost_weight: 0.1,       // points spent / 100
  operational_complexity_weight: 0.1, // limited qty / time adds small cost
} as const;

// ---- Expected incremental value heuristic (estimate, not causal) ----
export const EXPECTED_VALUE = {
  // conversion rate per mechanism (fraction of quota that converts) — ESTIMATE
  conversion_rate: {
    NO_DISCOUNT: 0.08,
    VALUE_ADD: 0.12,
    MIX_VALUE: 0.15,
    POINT_LOCKED: 0.18,
    LIMITED_QUANTITY: 0.2,
    FIRST_TRIAL: 0.25,
    TIME_AND_QUANTITY: 0.22,
    PERSONALIZED_VALUE: 0.3,
    PLUS_UPSELL: 0.1,
    DIRECT_PRICE: 0.28,
  },
  // audience_intent multiplier on conversion
  intent_multiplier: 1.0,
  min_incremental_orders: 1,   // below this the intervention isn't worth it
  min_net_value_positive: true, // expected revenue > tamam cost
} as const;

// ---- Strategy comparison (up to 3 alternatives) ----
export const STRATEGY_COMPARISON = {
  max_alternatives: 3,
  // tie-break: lower cost wins when scores equal
  cost_label: { low: 'منخفض', medium: 'متوسط', high: 'مرتفع' },
} as const;

// ---- Active-campaign safety reevaluation (recommendation only) ----
export const CAMPAIGN_SAFETY = {
  // when active campaign + pressure -> PAUSE_RECOMMENDED
  // when pressure clears + time remains + value positive -> RESUME_RECOMMENDED
  // when offer expired/sold out or no value -> COMPLETE_RECOMMENDED
  // otherwise CONTINUE
  recommendations: ['CONTINUE', 'PAUSE_RECOMMENDED', 'COMPLETE_RECOMMENDED', 'RESUME_RECOMMENDED'],
} as const;

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
      safe_operational_target: 20, projected_natural_orders: 5, existing_campaign_commitment: 0,
      baseline_orders: 7,
      audience_segment: 'NEW_TO_RESTAURANT', audience_size: 112, audience_intent_score: 0.8,
      cannibalization_score: 0.1, fatigue_score: 0.1, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.9, approval_required: false,
      restaurant_priority_score: 1.0, urgency_score: 0.5, data_confidence: 0.7,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
      capacity_source: 'heuristic_fallback',
    },
    expected: ['PREPARE', 'SCHEDULE'],
    expected_mechanism: ['FIRST_TRIAL', 'MIX_VALUE', 'VALUE_ADD'],
  },
  {
    key: 'B_busy_period',
    label: 'B — فترة ضغط (الجمعة 19:00)',
    description: 'RED / pressure, natural demand high, strong audience — TAMAM must NOT create demand.',
    day: 5, start: { h: 19, m: 0 }, end: { h: 21, m: 0 },
    inputs: {
      traffic_light: 'RED', restaurant_open: true, restaurant_status: 'busy', pressure_active: true,
      product_priority: 'NORMAL', product_available: true, mapping_valid: true,
      safe_operational_target: 0, projected_natural_orders: 25, existing_campaign_commitment: 0,
      baseline_orders: 25,
      audience_segment: 'REPEAT_CUSTOMER', audience_size: 80, audience_intent_score: 0.9,
      cannibalization_score: 0.85, fatigue_score: 0.2, operational_risk: 0.9, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.9, approval_required: false,
      restaurant_priority_score: 0.6, urgency_score: 0.3, data_confidence: 0.7,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
      capacity_source: 'realtime_restriction',
    },
    expected: ['NO_ACTION'],
    expected_mechanism: [],
  },
  {
    key: 'C_existing_fills_gap',
    label: 'C — حملة موجودة بتسكر الفجوة',
    description: 'Existing active campaign commitment already fills the safe demand gap — do not overlap.',
    day: 2, start: { h: 15, m: 0 }, end: { h: 17, m: 0 },
    inputs: {
      traffic_light: 'GREEN', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'STRENGTHEN', product_available: true, mapping_valid: true,
      safe_operational_target: 15, projected_natural_orders: 5, existing_campaign_commitment: 10,
      baseline_orders: 5,
      audience_segment: 'NEW_TO_RESTAURANT', audience_size: 60, audience_intent_score: 0.6,
      cannibalization_score: 0.3, fatigue_score: 0.3, operational_risk: 0.1, campaign_saturation: 0.85,
      commercial_safe: true, commercial_score: 0.8, approval_required: false,
      restaurant_priority_score: 1.0, urgency_score: 0.3, data_confidence: 0.6,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
      capacity_source: 'restaurant_default',
    },
    expected: ['NO_ACTION', 'WATCH'],
    expected_mechanism: [],
  },
  {
    key: 'D_surplus',
    label: 'D — فائض كمية (عندي كمية، 15 وحدة لغاية 22:00)',
    description: 'Partner surplus signal — high urgency, limited quantity, time-bounded.',
    day: 3, start: { h: 18, m: 0 }, end: { h: 22, m: 0 },
    inputs: {
      traffic_light: 'YELLOW', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'SURPLUS', product_available: true, mapping_valid: true,
      safe_operational_target: 15, projected_natural_orders: 0, existing_campaign_commitment: 0,
      baseline_orders: 8,
      audience_segment: 'public', audience_size: 150, audience_intent_score: 0.7,
      cannibalization_score: 0.2, fatigue_score: 0.1, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.85, approval_required: false,
      restaurant_priority_score: 0.9, urgency_score: 1.0, data_confidence: 0.7,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: 15,
      capacity_source: 'temporary_signal',
    },
    expected: ['ACT_NOW'],
    expected_mechanism: ['TIME_AND_QUANTITY'],
  },
  // ---- Advanced scenarios (Milestone 2) ----
  {
    key: 'E_high_cannibalization',
    label: 'E — cannibalization عالي (زباين رجعوا بنفس الفترة)',
    description: 'GREEN, capacity available, repeat customers at same period, small gap, HIGH cannibalization. No acquisition discount.',
    day: 5, start: { h: 20, m: 0 }, end: { h: 22, m: 0 },
    inputs: {
      traffic_light: 'GREEN', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'NORMAL', product_available: true, mapping_valid: true,
      safe_operational_target: 18, projected_natural_orders: 12, existing_campaign_commitment: 0,
      baseline_orders: 12,
      audience_segment: 'REPEAT_CUSTOMER', audience_size: 70, audience_intent_score: 0.75,
      cannibalization_score: 0.8, fatigue_score: 0.2, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.9, approval_required: false,
      restaurant_priority_score: 0.6, urgency_score: 0.3, data_confidence: 0.7,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
      capacity_source: 'restaurant_default',
    },
    expected: ['NO_ACTION', 'WATCH'],
    // must NOT be an acquisition discount; allow VALUE_ADD / LOYALTY only
    expected_mechanism_blacklist: ['FIRST_TRIAL', 'DIRECT_PRICE', 'MIX_VALUE'],
  },
  {
    key: 'F_high_intent_new_customer',
    label: 'F — جمهور جديد نية عالية (شاورما، تفاعل Mood كتير)',
    description: 'GREEN, Shawarma intent high, multiple Mood interactions, never purchased, gap positive, commercial safe, LOW cannibalization.',
    day: 1, start: { h: 15, m: 0 }, end: { h: 17, m: 0 },
    inputs: {
      traffic_light: 'GREEN', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'STRENGTHEN', product_available: true, mapping_valid: true,
      safe_operational_target: 20, projected_natural_orders: 4, existing_campaign_commitment: 0,
      baseline_orders: 6,
      audience_segment: 'NEW_TO_RESTAURANT', audience_size: 95, audience_intent_score: 0.92,
      cannibalization_score: 0.1, fatigue_score: 0.1, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.9, approval_required: false,
      restaurant_priority_score: 1.0, urgency_score: 0.5, data_confidence: 0.75,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
      capacity_source: 'restaurant_default',
    },
    expected: ['PREPARE', 'SCHEDULE'],
    expected_mechanism: ['FIRST_TRIAL', 'MIX_VALUE'],
  },
  {
    key: 'G_one_user_reactivation',
    label: 'G — إعادة تفعيل زبون واحد (غاب 60 يوم)',
    description: 'Audience size 1, previously frequent, lapsed 60 days, capacity available. No public campaign.',
    day: 2, start: { h: 15, m: 0 }, end: { h: 17, m: 0 },
    inputs: {
      traffic_light: 'GREEN', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'NORMAL', product_available: true, mapping_valid: true,
      safe_operational_target: 20, projected_natural_orders: 5, existing_campaign_commitment: 0,
      baseline_orders: 6,
      audience_segment: 'LAPSED_60', audience_size: 1, audience_intent_score: 0.6,
      cannibalization_score: 0.1, fatigue_score: 0.1, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.9, approval_required: false,
      restaurant_priority_score: 0.7, urgency_score: 0.3, data_confidence: 0.65,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
      capacity_source: 'restaurant_default',
    },
    expected: ['PREPARE'],
    expected_mechanism: ['PERSONALIZED_VALUE'],
  },
  {
    key: 'H_low_confidence_new_restaurant',
    label: 'H — مطعم جديد بيانات قليلة (تصريح فترة هادية + قدرة 10)',
    description: 'New restaurant, no sufficient history, declares 15-17 weak, capacity 10, low confidence. LEARNING MODE + EXPLORE + small quota.',
    day: 1, start: { h: 15, m: 0 }, end: { h: 17, m: 0 },
    inputs: {
      traffic_light: 'GREEN', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'NORMAL', product_available: true, mapping_valid: true,
      safe_operational_target: 10, projected_natural_orders: 2, existing_campaign_commitment: 0,
      baseline_orders: 2,
      audience_segment: 'NEW_TO_RESTAURANT', audience_size: 40, audience_intent_score: 0.55,
      cannibalization_score: 0.1, fatigue_score: 0.05, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.85, approval_required: false,
      restaurant_priority_score: 0.6, urgency_score: 0.3, data_confidence: 0.35,
      learning_mode: true, automation_mode: 'MANUAL', surplus_qty: null,
      capacity_source: 'restaurant_default',
    },
    expected: ['PREPARE'],
    expected_mechanism: ['FIRST_TRIAL', 'MIX_VALUE'],
    expected_explore: true,
    expected_quota_max: 5,
  },
  {
    key: 'I_commercial_unsafe',
    label: 'I — غير آمن تجارياً (السعر المقترح تحت الحد)',
    description: 'Strong gap, strong audience, capacity, but candidate price violates minimum_customer_offer_price / settlement guardrail.',
    day: 1, start: { h: 15, m: 0 }, end: { h: 17, m: 0 },
    inputs: {
      traffic_light: 'GREEN', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'STRENGTHEN', product_available: true, mapping_valid: true,
      safe_operational_target: 20, projected_natural_orders: 4, existing_campaign_commitment: 0,
      baseline_orders: 6,
      audience_segment: 'NEW_TO_RESTAURANT', audience_size: 100, audience_intent_score: 0.85,
      cannibalization_score: 0.1, fatigue_score: 0.1, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: false, commercial_score: 0.3, approval_required: true,
      restaurant_priority_score: 1.0, urgency_score: 0.5, data_confidence: 0.7,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
      capacity_source: 'restaurant_default',
    },
    expected: ['NEEDS_RESTAURANT_APPROVAL'],
    expected_mechanism: [],
  },
  {
    key: 'J_loyalty_without_crisis',
    label: 'J — ولاء/نقاط بدون أزمة طلب (طلب صحي)',
    description: 'Natural demand HEALTHY, no urgent gap, strategic LOYALTY objective, POINTS_ENGAGED audience, capacity available. PREPARE (not ACT_NOW).',
    day: 4, start: { h: 18, m: 0 }, end: { h: 22, m: 0 },
    inputs: {
      traffic_light: 'GREEN', restaurant_open: true, restaurant_status: 'open', pressure_active: false,
      product_priority: 'NORMAL', product_available: true, mapping_valid: true,
      safe_operational_target: 20, projected_natural_orders: 16, existing_campaign_commitment: 0,
      baseline_orders: 16,
      audience_segment: 'POINTS_ENGAGED', audience_size: 60, audience_intent_score: 0.65,
      cannibalization_score: 0.2, fatigue_score: 0.1, operational_risk: 0.1, campaign_saturation: 0.0,
      commercial_safe: true, commercial_score: 0.9, approval_required: false,
      restaurant_priority_score: 0.7, urgency_score: 0.2, data_confidence: 0.7,
      learning_mode: false, automation_mode: 'MANUAL', surplus_qty: null,
      capacity_source: 'restaurant_default',
    },
    expected: ['PREPARE'],
    expected_mechanism: ['POINT_LOCKED'],
    expected_not: ['ACT_NOW'],
  },
];