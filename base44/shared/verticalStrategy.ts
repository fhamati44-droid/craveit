/**
 * verticalStrategy.ts — pure strategy logic for Menu Verticals.
 * No SDK, no I/O — reusable by campaignRecommendationEngine and any
 * future vertical-aware engine. Importing functions supply the data.
 *
 * Strategy precedence (section 5):
 *   1. restaurant actual historical data
 *   2. restaurant manually configured demand schedule
 *   3. restaurant operational signals
 *   4. MenuVertical defaults
 * Never assume every business in one vertical has identical hours.
 */

export const DAYPARTS = [
  "BREAKFAST", "MID_MORNING", "LUNCH", "AFTERNOON",
  "DINNER", "LATE_NIGHT", "WEEKEND", "SEASONAL", "CUSTOM",
];

export const FULFILLMENT_TYPES = [
  "ON_DEMAND_PREPARED_FOOD",
  "SCHEDULED_PREPARED_FOOD",
  "RETAIL_PICK_AND_PACK",
  "FRESH_WEIGHT_BASED",
  "PREORDER",
];

/** Detect the daypart from a Date (Israel week: Fri/Sat = weekend). */
export function detectDaypart(date = new Date()) {
  const h = date.getHours();
  const day = date.getDay();
  const isWeekend = day === 5 || day === 6;
  if (isWeekend && h >= 10 && h < 23) return "WEEKEND";
  if (h >= 5 && h < 10) return "BREAKFAST";
  if (h >= 10 && h < 12) return "MID_MORNING";
  if (h >= 12 && h < 15) return "LUNCH";
  if (h >= 15 && h < 18) return "AFTERNOON";
  if (h >= 18 && h < 23) return "DINNER";
  if (h >= 23 || h < 5) return "LATE_NIGHT";
  return "CUSTOM";
}

/** Resolve the vertical for a restaurant/mealSet pair. MealSet wins (item-level). */
export function resolveVertical(restaurant, mealSet) {
  if (mealSet?.primary_vertical_id) return mealSet.primary_vertical_id;
  if (restaurant?.primary_vertical_id) return restaurant.primary_vertical_id;
  return null;
}

function nowHHMM(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function inWindow(hhmm, start, end) {
  if (!start || !end) return true;
  if (start <= end) return hhmm >= start && hhmm <= end;
  // wraps midnight, e.g. 23:00 → 04:00
  return hhmm >= start || hhmm <= end;
}

/**
 * Resolve demand expectation through the precedence chain.
 * Returns { level, source } where source identifies which layer won.
 */
export function resolveDemandExpectation({ historical, demandSchedule, operationalSignals, verticalStrategy }) {
  if (historical?.demand_level && historical.demand_level !== "unknown")
    return { level: historical.demand_level, source: "historical" };
  if (demandSchedule?.effective_demand_level && demandSchedule.effective_demand_level !== "unknown")
    return { level: demandSchedule.effective_demand_level, source: "demand_schedule" };
  if (operationalSignals?.demand_level && operationalSignals.demand_level !== "unknown")
    return { level: operationalSignals.demand_level, source: "operational_signal" };
  if (verticalStrategy?.demand_expectation && verticalStrategy.demand_expectation !== "unknown")
    return { level: verticalStrategy.demand_expectation, source: "vertical_default" };
  return { level: "unknown", source: "unknown" };
}

/** Match active daypart strategies for a vertical at a given day/time. */
export function matchDaypartStrategies({ verticalId, day, time, strategies }) {
  const hhmm = time || nowHHMM();
  return (strategies || [])
    .filter((s) => s.vertical_id === verticalId && s.active !== false)
    .filter((s) => s.day_of_week == null || s.day_of_week === day)
    .filter((s) => inWindow(hhmm, s.start_time, s.end_time))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/** Match active playbooks for a vertical + daypart. */
export function matchPlaybooks({ verticalId, daypart, playbooks }) {
  return (playbooks || [])
    .filter((p) => p.vertical_id === verticalId && p.active !== false)
    .filter((p) => !p.allowed_dayparts?.length || p.allowed_dayparts.includes(daypart))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Build an explainable recommendation from resolved inputs.
 * Sections 9 & 10: objective (why) / mechanic (what) / audience (who) /
 * placement (where) / vertical strategy (when & why it fits this business).
 */
export function buildRecommendation({
  restaurant,
  vertical,
  daypart,
  demand,
  daypartStrategy,
  playbook,
  masterProductIds,
  restaurantItemIds,
  guardrail,
  previousResults,
  missing,
  reasons,
  testTime,
}) {
  const now = testTime ? new Date(testTime) : new Date();
  const reasonsOut = [...(reasons || [])];
  const missingOut = [...(missing || [])];

  // Objective + mechanic from playbook (highest priority), else daypart strategy, else vertical default
  let objective = playbook?.objective || daypartStrategy?.recommended_objectives?.[0] || "IMMEDIATE_DEMAND";
  let mechanic = playbook?.mechanic || daypartStrategy?.recommended_mechanics?.[0] || "VALUE_ADD";
  let tier = playbook?.preferred_tiers?.[0] || daypartStrategy?.preferred_tiers?.[0] || "classic";
  let audience = playbook?.audience_segments?.length ? playbook.audience_segments : ["public"];
  const placements = ["home", "offers"];

  if (playbook) reasonsOut.push("matched_playbook");
  if (daypartStrategy) reasonsOut.push("matched_daypart_strategy");
  if (!playbook && !daypartStrategy) reasonsOut.push("vertical_default_only");

  // Demand-aware objective shift (precedence-aware, never overrides real data)
  if (demand.source === "historical" || demand.source === "demand_schedule") {
    if (demand.level === "quiet") {
      objective = "IMMEDIATE_DEMAND";
      reasonsOut.push(`low_demand_${demand.source}`);
    } else if (demand.level === "busy") {
      objective = "INCREASE_AOV";
      reasonsOut.push(`high_demand_${demand.source}`);
    }
  }

  // Surplus / sold-out from operational signals → surplus objective, avoid discount on sold-out
  if (guardrail?.surplus_signal) { objective = "SURPLUS"; reasonsOut.push("surplus_signal"); }
  if (guardrail?.sold_out_items?.length) {
    reasonsOut.push("sold_out_present");
    if (!missingOut.includes("item_availability")) missingOut.push("item_availability");
  }

  // Avoid discounting guardrail from daypart strategy
  let maxDiscount = daypartStrategy?.maximum_discount_percent || 0;
  if (daypartStrategy?.avoid_discounting) {
    mechanic = "VALUE_ADD";
    reasonsOut.push("avoid_discounting_daypart");
  }

  // Tier guardrail from playbooks
  if (!playbook?.preferred_tiers?.length && !daypartStrategy?.preferred_tiers?.length) {
    missingOut.push("preferred_tier");
  }

  // Quota from guardrail defaults
  let quota = guardrail?.max_campaign_orders || 20;
  if (tier === "plus") quota = Math.min(quota, 15);
  if (guardrail?.learning_mode) quota = Math.min(quota, guardrail.learning_mode_order_cap || 5);

  // Window: next 3 hours by default, clamped to same day
  const start = new Date(now);
  const end = new Date(now.getTime() + 3 * 3600 * 1000);
  if (demand.level === "quiet") end.setHours(end.getHours() + 1); // quiet → longer window

  // Confidence: how many precedence layers + data completeness
  let confidence = 0.3;
  if (masterProductIds?.length) confidence += 0.2;
  if (restaurantItemIds?.length) confidence += 0.15;
  if (demand.source !== "unknown") confidence += 0.15;
  if (playbook) confidence += 0.1;
  if (previousResults?.length) confidence += 0.1;
  confidence = Math.min(0.95, confidence);
  if (missingOut.length >= 3) confidence = Math.max(0.2, confidence - 0.15);

  // Placements by objective
  if (objective === "NEW_CUSTOMERS" || objective === "ACQUISITION") placements.push("mood_game", "push");
  if (objective === "REACTIVATION") placements.push("push", "crm");
  if (objective === "INCREASE_AOV") placements.push("home");

  // Arabic explanation — never exposes raw scores or internal codes
  const parts = [];
  const vName = vertical?.name_ar || "هالنوع من المطاعم";
  const daypartAr = daypartArLabel(daypart);
  parts.push(`بناءً على ${vName} ووقت ${daypartAr}`);
  if (demand.source === "historical") parts.push(`وعلى طلباتك السابقة (${demand.level === "quiet" ? "وقت هادي" : demand.level === "busy" ? "وقت زحمة" : "وقت عادي"})`);
  else if (demand.source === "demand_schedule") parts.push("وعلى جدول الطلب اللي حدّدته");
  else if (demand.source === "vertical_default") parts.push("وعلى افتراضات هالنوع من المطعم");
  if (guardrail?.surplus_signal) parts.push("وفي كميات فائضة مناسبة لعرض فائض");
  parts.push(`، بنقترح عرض بهدف ${objectiveAr(objective)} عبر ${mechanicAr(mechanic)}`);
  if (tier) parts.push(`لمستوى ${tierAr(tier)}`);
  const explanation_ar = parts.join("") + ".";

  return {
    recommended_objective: objective,
    recommended_mechanic: mechanic,
    recommended_tier: tier,
    recommended_master_products: masterProductIds || [],
    recommended_restaurant_items: restaurantItemIds || [],
    recommended_audience: audience,
    recommended_placements: placements,
    recommended_start_at: start.toISOString(),
    recommended_end_at: end.toISOString(),
    recommended_quota: quota,
    reason_codes: reasonsOut,
    explanation_ar,
    confidence_score: Math.round(confidence * 100) / 100,
    missing_data: missingOut,
  };
}

export function daypartArLabel(dp) {
  return {
    BREAKFAST: "الصباح", MID_MORNING: "بين الصبح والضهر", LUNCH: "الغدا",
    AFTERNOON: "العصرية", DINNER: "العشاء", LATE_NIGHT: "آخر الليل",
    WEEKEND: "الويكند", SEASONAL: "موسمي", CUSTOM: "مخصص",
  }[dp] || "اليوم";
}
export function objectiveAr(o) {
  return {
    NEW_CUSTOMERS: "جذب زبائن جداد", ACQUISITION: "جذب زبائن جداد",
    REACTIVATION: "إرجاع زبائن قديمين", IMMEDIATE_DEMAND: "تفعيل الطلب إسا",
    INCREASE_AOV: "رفع قيمة الطلب", LOYALTY_ENGAGEMENT: "ولاء", CONVERSION_RECOVERY: "استرجاع طلبات ما اكتملت",
    SURPLUS: "تصريف فائض", STRENGTHEN_ITEM: "تقوية صنف", TEST_RESTAURANT: "تجربة مطعم",
    REPEAT_PURCHASE: "تكرار طلب", PAYDAY_AOV: "أول الشهر",
  }[o] || o;
}
export function mechanicAr(m) {
  return {
    FIRST_TRIAL: "تجربة أولى", VALUE_ADD: "قيمة مضافة", POINT_LOCKED: "فتح بالنقاط",
    TIME_AND_QUANTITY: "وقت وكمية محدودة", LIMITED_QUANTITY: "كمية محدودة",
    PERSONALIZED_VALUE: "عرض شخصي", DIRECT_PRICE: "خصم مباشر", CROSS_RESTAURANT: "عبر المطاعم",
  }[m] || m;
}
export function tierAr(t) {
  return { classic: "Classic", mix: "Mix", plus: "Plus" }[t] || t;
}