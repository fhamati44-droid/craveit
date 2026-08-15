// TAMAM Campaign & Demand Engine — shared commercial + eligibility logic.
// Pure (no SDK) so it can be imported by campaignEngine and reused/tests.

export const COMMISSION_RATE = 0.25;
export const TAMAM_CONTRIBUTION_MAX_PP = 0.07; // 7 percentage points of normal price

export const OFFER_TYPES = [
  "STANDARD_VALUE", "DIRECT_PRICE", "VALUE_ADD", "FIRST_TRIAL", "REACTIVATION",
  "LIMITED_TIME", "LIMITED_QUANTITY", "TIME_AND_QUANTITY", "POINT_LOCKED",
  "COUPON_LOCKED", "LOYALTY", "AOV_UPSELL", "SURPLUS", "RAW_MATERIAL_OPPORTUNITY",
  "COMMUNITY", "CROSS_RESTAURANT",
];

export const CAMPAIGN_OBJECTIVES = [
  "NEW_CUSTOMERS", "REACTIVATION", "IMMEDIATE_DEMAND", "INCREASE_AOV",
  "LOYALTY_ENGAGEMENT", "CONVERSION_RECOVERY", "SURPLUS", "STRENGTHEN_ITEM",
  "TEST_RESTAURANT", "REPEAT_PURCHASE", "PAYDAY_AOV", "ACQUISITION",
];

export const AUDIENCE_SEGMENTS = [
  "NEW_TO_RESTAURANT", "REPEAT_CUSTOMER", "LAPSED_30", "LAPSED_60",
  "HIGH_INTENT_NO_PURCHASE", "CART_ABANDONER", "CATEGORY_LOVER", "MOOD_AFFINITY",
  "VALUE_SEEKER", "POINTS_ENGAGED", "HIGH_AOV", "FAMILY", "LATE_NIGHT",
  "PAYDAY_ACTIVE", "ENTERTAINMENT_DRIVEN", "CONVENIENCE_DRIVEN", "public",
];

// Restaurant-facing segment language — no raw IDs / SQL shown to owners.
export const AUDIENCE_LABEL_AR: Record<string, string> = {
  NEW_TO_RESTAURANT: "ناس مهتمين بالشاورما ولسه ما جرّبوا مطعمك",
  REPEAT_CUSTOMER: "زباين طلبوا منك قبل",
  LAPSED_30: "زباين طلبوا منك قبل وما رجعوا من شهر",
  LAPSED_60: "زباين قديمين ما رجعوا من فترة طويلة",
  HIGH_INTENT_NO_PURCHASE: "ناس شافوا الأكلة وم ما اطلبوا",
  VALUE_SEEKER: "زباين بيحبوا العروض",
  POINTS_ENGAGED: "زباين ناشطين بالنقاط",
  HIGH_AOV: "زباين بطلبوا سلات أكبر",
  FAMILY: "زباين عائليين بنهاية الأسبوع",
  PAYDAY_ACTIVE: "زباين نشاطهم بزيد بداية الشهر",
  public: "كل الزباين",
};

export const CAMPAIGN_STATUS = ["DRAFT", "READY", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"];
export const OPPORTUNITY_STATUS = ["NEW", "REVIEWING", "USED", "DISMISSED", "EXPIRED"];
export const OFFER_STATUS = ["draft", "ready", "scheduled", "active", "sold_out", "expired", "paused", "completed"];

// Traffic-light model. GREEN = good opportunity to push demand (NOT "busy").
export function trafficLightFromDemand(level: string | null | undefined): "GREEN" | "YELLOW" | "RED" {
  switch (level) {
    case "quiet": return "GREEN";
    case "busy": return "RED";
    case "medium":
    default: return "YELLOW";
  }
}

export const TRAFFIC_LIGHT_AR: Record<string, string> = {
  GREEN: "TAMAM تقدر تدفع طلبات إضافية",
  YELLOW: "تقدر تضيف بحذر",
  RED: "لا تدفع طلبات إضافية",
};

// Price calculator: restaurant wants to receive `net` → required customer price.
// Correct math: net / (1 - commission). NOT net + 25%.
export function priceForRestaurantNet(net: number, commissionRate = COMMISSION_RATE): number {
  return net / (1 - commissionRate);
}

export interface CommercialInput {
  normal_price: number;
  customer_price: number;
  restaurant_contribution?: number;
  tamam_contribution?: number;
}

export interface CommercialBreakdown {
  normal: number;
  customer: number;
  discount: number;
  commission_on_normal: number;
  restaurant_floor: number;
  restaurant_contribution: number;
  tamam_contribution: number;
  restaurant_settlement: number;
  tamam_revenue: number;
}

export function commercialBreakdown(input: CommercialInput): CommercialBreakdown {
  const normal = Number(input.normal_price) || 0;
  const customer = Number(input.customer_price) || 0;
  const discount = Math.max(0, normal - customer);
  const commissionOnNormal = normal * COMMISSION_RATE;
  const restaurantFloor = normal - commissionOnNormal;
  const rContribution = Number(input.restaurant_contribution) || 0;
  const tContribution = Number(input.tamam_contribution) || 0;
  return {
    normal,
    customer,
    discount,
    commission_on_normal: round2(commissionOnNormal),
    restaurant_floor: round2(restaurantFloor),
    restaurant_contribution: rContribution,
    tamam_contribution: tContribution,
    restaurant_settlement: round2(restaurantFloor - rContribution),
    tamam_revenue: round2(commissionOnNormal - tContribution),
  };
}

export function validateFunding(input: CommercialInput): { ok: boolean; reason?: string } {
  const discount = Math.max(0, (input.normal_price || 0) - (input.customer_price || 0));
  const sum = (input.restaurant_contribution || 0) + (input.tamam_contribution || 0);
  if (Math.abs(sum - discount) > 0.01) return { ok: false, reason: "funding_mismatch" };
  if ((input.tamam_contribution || 0) > TAMAM_CONTRIBUTION_MAX_PP * (input.normal_price || 0) + 0.01)
    return { ok: false, reason: "tamam_contribution_exceeds_cap" };
  if ((input.restaurant_contribution || 0) < 0 || (input.tamam_contribution || 0) < 0)
    return { ok: false, reason: "negative_contribution" };
  return { ok: true };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export interface EligibilityInput {
  offer: {
    start_at?: string;
    end_at?: string;
    quota_total?: number | null;
    quota_used?: number;
    unlock_type?: string;
    unlock_points?: number;
    audience_rule?: string[];
    audience_size?: number;
    customer_price?: number;
  };
  nowMs: number;
  segments: string[];
  isTargetedUser: boolean;
  pointsBalance: number;
  hasUnlocked: boolean;
}

export interface EligibilityResult {
  card_state: string;
  eligible: boolean;
  visible: boolean;
  locked: boolean;
  unlocked: boolean;
  time_state: string;
  remaining_time_ms: number | null;
  remaining_quota: number | null;
  reason: string;
  customer_price: number;
}

export function evaluateOfferPure(input: EligibilityInput): EligibilityResult {
  const { offer, nowMs } = input;
  const start = offer.start_at ? new Date(offer.start_at).getTime() : 0;
  const end = offer.end_at ? new Date(offer.end_at).getTime() : Infinity;
  let timeState = "active";
  if (nowMs < start) timeState = "scheduled";
  if (nowMs >= end) timeState = "ended";

  const total = offer.quota_total == null ? null : offer.quota_total;
  const remaining = total == null ? null : Math.max(0, total - (offer.quota_used || 0));
  const soldOut = total != null && remaining === 0;

  const audience = offer.audience_rule || [];
  const singleUser = offer.audience_size === 1;
  const audienceOk =
    !audience.length ||
    audience.some((a) => input.segments.includes(a)) ||
    (singleUser && input.isTargetedUser);

  const locked = offer.unlock_type === "point_locked" && (offer.unlock_points || 0) > 0;
  const unlocked = locked ? input.hasUnlocked : false;

  let cardState = "NORMAL";
  let eligible = false;
  let visible = false;
  let reason = "";

  if (timeState === "ended") { cardState = "EXPIRED"; visible = audienceOk; reason = "expired"; }
  else if (soldOut) { cardState = "SOLD_OUT"; visible = audienceOk; reason = "sold_out"; }
  else if (timeState === "scheduled") { cardState = "UPCOMING"; visible = true; reason = "not_started"; }
  else if (!audienceOk) { cardState = "NOT_ELIGIBLE"; visible = false; reason = "audience"; }
  else if (locked && !unlocked) {
    cardState = "LOCKED_POINTS"; visible = true; reason = "locked";
    if ((input.pointsBalance || 0) < (offer.unlock_points || 0)) reason = "insufficient_points";
  }
  else if (locked && unlocked) { cardState = "UNLOCKED"; visible = true; eligible = true; }
  else { cardState = "ACTIVE"; visible = true; eligible = true; }

  const remainingTime = isFinite(end) ? Math.max(0, end - nowMs) : null;
  return {
    card_state: cardState,
    eligible,
    visible,
    locked: locked && !unlocked,
    unlocked,
    time_state: timeState,
    remaining_time_ms: remainingTime,
    remaining_quota: remaining,
    reason,
    customer_price: offer.customer_price || 0,
  };
}

// Split a discount into TAMAM (capped at 7pp of normal) + restaurant contribution.
export function cappedContributions(normal_price: number, customer_price: number) {
  const discount = Math.max(0, (normal_price || 0) - (customer_price || 0));
  const cap = Math.round(TAMAM_CONTRIBUTION_MAX_PP * (normal_price || 0) * 100) / 100;
  const tamam = Math.min(discount, cap);
  const restaurant = Math.round((discount - tamam) * 100) / 100;
  return { restaurant_contribution: restaurant, tamam_contribution: tamam };
}