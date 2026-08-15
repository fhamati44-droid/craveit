// ============================================================================
// demandExecutionConfig — Guarded Demand Execution (Milestone 3) configuration.
// Execution Policy controls AUTOMATION. CommercialGuardrail controls COMMERCIAL
// PERMISSION. They work together but never overlap.
// ============================================================================

export const DEMO_BATCH_EXEC = 'tamam-demand-execution-demo-v1';

// ---- Default policy for a new restaurant (conservative) ----
export const POLICY_DEFAULTS = {
  automation_mode: 'MANUAL',
  auto_schedule_allowed: false,
  auto_activate_allowed: false,
  max_campaign_duration_minutes: 240,
  max_campaign_orders: 20,
  max_simultaneous_campaigns: 2,
  max_tamam_contribution: 15,
  max_restaurant_contribution: 15,
  direct_discount_allowed: false,
  value_add_allowed: true,
  points_offer_allowed: true,
  limited_quantity_allowed: true,
  personalized_offer_allowed: true,
  allowed_start_times: [],
  blocked_times: [],
  minimum_confidence: 0.5,
  minimum_opportunity_score: 60,
  learning_mode_order_cap: 5,
  require_approval_outside_limits: true,
  kill_switch_enabled: true,
} as const;

// Conservative guarded policy for demo / new restaurants
export const GUARDED_DEFAULTS = {
  automation_mode: 'GUARDED_AUTOMATION',
  auto_schedule_allowed: true,
  auto_activate_allowed: true,
  max_campaign_duration_minutes: 240,
  max_campaign_orders: 20,
  max_simultaneous_campaigns: 2,
  max_tamam_contribution: 15,
  max_restaurant_contribution: 15,
  direct_discount_allowed: false,
  value_add_allowed: true,
  points_offer_allowed: true,
  limited_quantity_allowed: true,
  personalized_offer_allowed: true,
  minimum_confidence: 0.5,
  minimum_opportunity_score: 60,
  learning_mode_order_cap: 5,
  require_approval_outside_limits: true,
  kill_switch_enabled: true,
} as const;

// ---- Mechanism -> policy flag that must permit it ----
export const MECHANISM_POLICY_FLAG: Record<string, string> = {
  NO_DISCOUNT: 'value_add_allowed',        // highlight, no price change — always permitted
  VALUE_ADD: 'value_add_allowed',
  MIX_VALUE: 'value_add_allowed',
  POINT_LOCKED: 'points_offer_allowed',
  LIMITED_QUANTITY: 'limited_quantity_allowed',
  FIRST_TRIAL: 'value_add_allowed',
  TIME_AND_QUANTITY: 'limited_quantity_allowed',
  PERSONALIZED_VALUE: 'personalized_offer_allowed',
  PLUS_UPSELL: 'value_add_allowed',
  DIRECT_PRICE: 'direct_discount_allowed',
};

// ---- Safety gate check ids (deterministic, evaluated before every execution) ----
export const SAFETY_GATE_CHECKS = [
  'decision_valid',          // decision still actionable + not expired (valid_until)
  'restaurant_open',
  'no_pressure',
  'item_available',
  'product_mapping_valid',
  'safe_capacity_positive',  // recommended quota <= safe capacity
  'quota_within_capacity',
  'commercial_guardrails',   // CommercialGuardrail floor respected
  'policy_permits_mechanism',
  'score_above_threshold',
  'confidence_above_threshold',
  'fatigue_acceptable',
  'no_conflicting_offer',    // same restaurant/item/variant/audience/time
  'tamam_contribution_within_limit',
  'restaurant_contribution_within_limit',
  'time_window_relevant',
  'audience_valid',
  'simultaneous_campaign_load', // within max_simultaneous_campaigns
] as const;

// ---- Pre-activation revalidation outcomes ----
export const ACTIVATION_OUTCOMES = ['ACTIVATE', 'DELAY', 'REDUCE_QUOTA', 'NEEDS_REVIEW', 'CANCEL'] as const;

// ---- Live campaign monitor states ----
export const MONITOR_STATES = ['HEALTHY', 'UNDERPERFORMING', 'CAPACITY_RISK', 'COMMERCIAL_RISK', 'SOLD_OUT', 'EXPIRED', 'PAUSED_OPERATIONAL', 'NEEDS_REVIEW', 'UNKNOWN'] as const;

// ---- Underperforming recommendation options (NOT auto-executed) ----
export const UNDERPERFORMING_OPTIONS = ['CHANGE_AUDIENCE', 'CHANGE_CHANNEL', 'SWITCH_TO_VALUE_ADD', 'REDUCE_QUOTA', 'PAUSE', 'NO_CHANGE'] as const;

// ---- Campaign plan status machine (allowed transitions) ----
export const PLAN_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['VALIDATING', 'REJECTED', 'CANCELLED'],
  VALIDATING: ['READY', 'APPROVAL_REQUIRED', 'REJECTED', 'CANCELLED'],
  READY: ['SCHEDULED', 'APPROVAL_REQUIRED', 'CANCELLED'],
  APPROVAL_REQUIRED: ['READY', 'REJECTED', 'CANCELLED'],
  REJECTED: ['CANCELLED'],
  SCHEDULED: ['EXECUTED', 'PAUSED', 'CANCELLED', 'READY'],
  EXECUTED: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['EXECUTED', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// ---- EXPLORE hard caps (override policy if smaller) ----
export const EXPLORE_CAPS = {
  max_orders: 5,
  max_customers: 20,
  max_duration_minutes: 60,
  max_tamam_contribution: 8,
} as const;

// ---- Decision validity windows (section 7) ----
// Real-time surplus (ACT_NOW): short validity. Scheduled weak-hour: valid until
// shortly before the scheduled window. Default fallback validity in minutes.
export const VALID_UNTIL = {
  act_now_minutes: 30,                 // surplus / urgent — 30 min
  scheduled_buffer_minutes: 15,        // valid until 15 min before window_start
  default_minutes: 120,
} as const;

// ---- Campaign learning reliability rules ----
export const LEARNING = {
  min_sample_size: 4,        // below this -> INSUFFICIENT_DATA
  min_confidence: 0.5,       // below this -> INSUFFICIENT_DATA
  // strong vs moderate vs weak by estimated incremental orders
  strong_min_incremental: 4,
  moderate_min_incremental: 2,
} as const;

// ---- Audit action labels (Arabic, internal use) ----
export const AUDIT_ACTION_AR: Record<string, string> = {
  decision_accepted: 'تم قبول القرار',
  opportunity_created: 'تم إنشاء الفرصة',
  plan_generated: 'تم توليد الخطة',
  validation_pass: 'اجتاز بوابة الأمان',
  validation_fail: 'فشل بوابة الأمان',
  campaign_scheduled: 'تمت جدولة الحملة',
  campaign_activated: 'تم تفعيل الحملة',
  quota_adjusted: 'تم تعديل الكمية',
  campaign_paused: 'تم إيقاف الحملة',
  campaign_resumed: 'تم استئناف الحملة',
  campaign_completed: 'تم إكمال الحملة',
  approval_requested: 'طلبت موافقة',
  manual_override: 'تدخل يدوي',
  kill_switch_triggered: 'تم تفعيل مفتاح الإيقاف',
  plan_rejected: 'تم رفض الخطة',
  plan_cancelled: 'تم إلغاء الخطة',
};

// ---- Mechanism -> CampaignOffer.offer_type (mirror of demandDecisionConfig) ----
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

// ---- Objective -> Campaign.objective (mirror of demandDecisionConfig) ----
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

// ---- Human-readable labels (Arabic) ----
export const MONITOR_STATE_AR: Record<string, string> = {
  HEALTHY: 'صحية',
  UNDERPERFORMING: 'أداء ضعيف',
  CAPACITY_RISK: 'خطر قدرة',
  COMMERCIAL_RISK: 'خطر تجاري',
  SOLD_OUT: 'نفدت الكمية',
  EXPIRED: 'منتهية',
  PAUSED_OPERATIONAL: 'متوقفة تشغيلياً',
  NEEDS_REVIEW: 'تحتاج مراجعة',
  UNKNOWN: 'غير معروف',
};

export const PLAN_STATUS_AR: Record<string, string> = {
  DRAFT: 'مسودة',
  VALIDATING: 'قيد التحقق',
  READY: 'جاهزة',
  APPROVAL_REQUIRED: 'تتطلب موافقة',
  REJECTED: 'مرفوضة',
  SCHEDULED: 'مجدولة',
  EXECUTED: 'منفّذة',
  PAUSED: 'متوقفة',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
};