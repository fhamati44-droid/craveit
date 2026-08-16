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

// ===========================================================================
// applySafetyPrecedence — additive safety/precedence layer over a draft
// recommendation produced by buildRecommendation. Pure, no I/O. Never changes
// the existing playbook/daypart logic; only layers authoritative reality on
// top so the vertical draft can NEVER override operational/commercial safety.
//
// Precedence (section 1):
//   1. REAL-TIME OPERATIONAL SAFETY  (closed / paused / pressure / RED / sold-out)
//   2. COMMERCIAL + EXECUTION SAFETY (floor / load limit / existing conflict)
//   3. RESTAURANT-SPECIFIC CURRENT FACTS (temporary surplus)
//   4. RESTAURANT STRATEGY OVERRIDE (admin-configured)
//   5. MATCHED VERTICAL PLAYBOOK
//   6. DAYPART STRATEGY
//   7. GENERIC FALLBACK
// Partner-provided facts are SIGNALS only (section 2): they may rank/confidence
// but never override real operational/commercial state or strong evidence.
// ===========================================================================

export function applySafetyPrecedence(rec: any, safety: any = {}) {
  const reasons: string[] = [...(rec.reason_codes || [])];
  const chain: any = {
    operational_safety: { applied: false, detail: "" },
    commercial_execution_safety: { applied: false, detail: "" },
    restaurant_current_facts: { applied: false, detail: "" },
    restaurant_override: { applied: false, detail: "" },
    vertical_playbook: { applied: reasons.includes("matched_playbook"), detail: rec._playbookName || "", superseded: false },
    daypart_strategy: { applied: reasons.includes("matched_daypart_strategy"), detail: "", superseded: false },
    generic_fallback: { applied: reasons.includes("vertical_default_only"), detail: "" },
  };
  const sourceLabels: string[] = [];

  // 1. OPERATIONAL SAFETY — highest, overrides everything below
  const op = safety.operationalBlock;
  if (op?.blocked) {
    chain.operational_safety.applied = true;
    chain.operational_safety.detail = op.reason;
    chain.vertical_playbook.superseded = chain.vertical_playbook.applied;
    chain.daypart_strategy.superseded = chain.daypart_strategy.applied;
    return finalize(rec, {
      recommended_objective: "NO_ACTION",
      recommended_mechanic: null,
      recommended_quota: 0,
      recommended_restaurant_items: [],
      recommended_master_products: [],
      reason_codes: op.reason === "restaurant_closed"
        ? ["RESTAURANT_CLOSED", "OPERATIONAL_PRESSURE", "no_new_demand"]
        : ["OPERATIONAL_PRESSURE", "no_new_demand"],
      explanation_ar: safetyExplanation("NO_ACTION",
        op.reason === "restaurant_closed" ? "المطعم مقفل أو متوقف هلا" : "في ضغط تشغيلي عالي (أحمر) هلا",
        ["restaurant_override", "vertical_playbook", "daypart_strategy"]),
      confidence_score: 0.9,
      missing_data: [],
    }, chain, ["ACTUAL"]);
  }

  // 1b. ITEM AVAILABILITY (operational) — sold-out target (Test B)
  const iu = safety.itemUnavailable;
  if (iu && !iu.anyAvailable) {
    chain.operational_safety.applied = true;
    chain.operational_safety.detail = "no_available_items";
    chain.vertical_playbook.superseded = chain.vertical_playbook.applied;
    return finalize(rec, {
      recommended_objective: "NO_ACTION",
      recommended_mechanic: null,
      recommended_quota: 0,
      recommended_restaurant_items: [],
      reason_codes: ["ITEM_UNAVAILABLE", "no_available_items"],
      explanation_ar: safetyExplanation("NO_ACTION", "الصنف المستهدف غير متوفر/نفد", ["vertical_playbook"]),
      confidence_score: 0.85,
    }, chain, ["ACTUAL"]);
  }
  if (iu?.tierTargetSoldOut && iu.anyAvailable) {
    reasons.push("item_unavailable_target_skipped", "alternative_item_chosen");
    sourceLabels.push("ACTUAL");
  }

  // 2. COMMERCIAL + EXECUTION SAFETY
  // 2a. existing same-item / time / audience campaign conflict (Test F)
  if (safety.existingConflict?.conflict) {
    chain.commercial_execution_safety.applied = true;
    chain.commercial_execution_safety.detail = "EXISTING_CAMPAIGN_CONFLICT";
    chain.vertical_playbook.superseded = chain.vertical_playbook.applied;
    return finalize(rec, {
      recommended_objective: "NO_ACTION",
      recommended_mechanic: null,
      recommended_quota: 0,
      reason_codes: ["EXISTING_CAMPAIGN_CONFLICT", "no_duplicate_campaign"],
      explanation_ar: safetyExplanation("NO_ACTION", "في حملة شغالة على نفس الصنف والوقت والجمهور", ["vertical_playbook"]),
      confidence_score: 0.85,
    }, chain, ["ACTUAL"]);
  }
  // 2b. campaign load limit (Test E)
  const cl = safety.campaignLoad;
  if (cl && cl.max > 0 && cl.activeCount >= cl.max) {
    chain.commercial_execution_safety.applied = true;
    chain.commercial_execution_safety.detail = `CAMPAIGN_LOAD_LIMIT (${cl.activeCount}/${cl.max})`;
    chain.vertical_playbook.superseded = chain.vertical_playbook.applied;
    return finalize(rec, {
      recommended_objective: "WATCH",
      recommended_mechanic: null,
      recommended_quota: 0,
      reason_codes: ["CAMPAIGN_LOAD_LIMIT", "watch_until_capacity"],
      explanation_ar: safetyExplanation("WATCH", `المطعم وصل للحد الأقصى من الحملات المتزامنة (${cl.activeCount}/${cl.max})`, ["vertical_playbook"]),
      confidence_score: 0.8,
    }, chain, ["ACTUAL"]);
  }
  // 2c. commercial floor (Test C)
  const cm = safety.commercial;
  if (cm && !cm.safe) {
    chain.commercial_execution_safety.applied = true;
    chain.commercial_execution_safety.detail = "COMMERCIAL_FLOOR_VIOLATION";
    const priceLed = ["FIRST_TRIAL", "DIRECT_PRICE", "LIMITED_QUANTITY"].includes(rec.recommended_mechanic);
    let mech = rec.recommended_mechanic;
    let obj = rec.recommended_objective;
    if (priceLed) {
      if (cm.valueAddAllowed) { mech = "VALUE_ADD"; reasons.push("commercial_safety_switch_to_value_add"); }
      else if (cm.pointsAllowed) { mech = "POINT_LOCKED"; reasons.push("commercial_safety_switch_to_points"); }
      else { mech = null; obj = "NEEDS_RESTAURANT_APPROVAL"; reasons.push("needs_restaurant_approval"); }
    }
    reasons.push("COMMERCIAL_FLOOR_VIOLATION");
    return finalize(rec, {
      recommended_objective: obj,
      recommended_mechanic: mech,
      recommended_quota: obj === "NEEDS_RESTAURANT_APPROVAL" ? 0 : rec.recommended_quota,
      reason_codes: reasons,
      explanation_ar: safetyExplanation(
        obj === "NEEDS_RESTAURANT_APPROVAL" ? "NEEDS_RESTAURANT_APPROVAL" : "RECOMMEND",
        "السعر المقترح تحت الحد التجاري الآمن",
        [], mech),
      confidence_score: Math.max(0.3, (rec.confidence_score || 0.5) - 0.1),
    }, chain, ["ACTUAL", "PLAYBOOK"]);
  }

  // 3. RESTAURANT-SPECIFIC CURRENT FACTS — surplus beats generic playbook (Test G)
  const sp = safety.surplus;
  if (sp && sp.qty > 0 && !safety.operationalBlock?.blocked) {
    chain.restaurant_current_facts.applied = true;
    chain.restaurant_current_facts.detail = `surplus qty=${sp.qty} until=${sp.until || "—"}`;
    chain.vertical_playbook.superseded = chain.vertical_playbook.applied;
    chain.daypart_strategy.superseded = chain.daypart_strategy.applied;
    reasons.push("surplus_restaurant_fact", "surplus_overrides_playbook");
    return finalize(rec, {
      recommended_objective: "SURPLUS",
      recommended_mechanic: "TIME_AND_QUANTITY",
      recommended_quota: Math.min(rec.recommended_quota || 5, Math.max(1, Math.floor(sp.qty))),
      reason_codes: reasons,
      explanation_ar: safetyExplanation("RECOMMEND", `في كمية فائضة (${sp.qty}) لحد ${sp.until || "—"}`, ["vertical_playbook"], "TIME_AND_QUANTITY"),
      confidence_score: Math.min(0.95, (rec.confidence_score || 0.5) + 0.1),
    }, chain, ["ACTUAL", "PARTNER_PROVIDED"]);
  }

  // 4. RESTAURANT STRATEGY OVERRIDE — supersedes playbook, never modifies it (Test D)
  const ov = safety.restaurantOverride;
  if (ov && (ov.objective || ov.mechanic || ov.tier) && !safety.operationalBlock?.blocked) {
    chain.restaurant_override.applied = true;
    chain.restaurant_override.detail = `override obj=${ov.objective || "—"} mech=${ov.mechanic || "—"} tier=${ov.tier || "—"}`;
    chain.vertical_playbook.superseded = chain.vertical_playbook.applied;
    if (ov.objective) rec.recommended_objective = ov.objective;
    if (ov.mechanic) rec.recommended_mechanic = ov.mechanic;
    if (ov.tier) rec.recommended_tier = ov.tier;
    reasons.push("restaurant_override_supersedes_playbook");
    return finalize(rec, {
      reason_codes: reasons,
      explanation_ar: safetyExplanation("RECOMMEND", "تجاوز استراتيجي مفعّل لهاد المطعم", ["vertical_playbook"], ov.mechanic),
      confidence_score: Math.min(0.95, (rec.confidence_score || 0.5) + 0.05),
    }, chain, ["PARTNER_PROVIDED", "PLAYBOOK"]);
  }

  // 5/6/7 — playbook / daypart / fallback already applied by buildRecommendation

  // 8. PARTNER FACTS AS SIGNALS — historical/actual contradiction (Test H)
  const pf = safety.partnerFacts;
  const hist = safety.historical;
  if (pf?.recommendedWindows?.length && hist?.pressureInWindow) {
    reasons.push("PARTNER_SIGNAL_CONFLICT");
    return finalize(rec, {
      recommended_objective: "WATCH",
      recommended_mechanic: null,
      recommended_quota: 0,
      reason_codes: reasons,
      explanation_ar: safetyExplanation("WATCH", "البيانات الفعلية بتعبّر عن ضغط بالفترة اللي اقترحها الشريك — ما بنتبع إشارة الشريك هلا", ["partner_window"]),
      confidence_score: Math.max(0.2, (rec.confidence_score || 0.5) - 0.25),
    }, chain, ["PARTNER_PROVIDED", "ACTUAL"]);
  }

  // default — keep draft, attach source labels
  if (hist) sourceLabels.push("ACTUAL");
  if (chain.vertical_playbook.applied) sourceLabels.push("PLAYBOOK");
  if (chain.daypart_strategy.applied) sourceLabels.push("DAYPART");
  if (pf?.recommendedWindows?.length) sourceLabels.push("PARTNER_PROVIDED");
  return finalize(rec, {}, chain, sourceLabels);
}

function finalize(rec: any, overrides: any, chain: any, sourceLabels: string[]) {
  return {
    ...rec,
    ...overrides,
    _precedence_chain: chain,
    _source_labels: [...new Set(sourceLabels)],
  };
}

function safetyExplanation(final: string, top: string, superseded: string[] = [], switchedTo?: string | null) {
  const head = final === "NO_ACTION" ? "ما بنوصي بحملة هلا"
    : final === "WATCH" ? "بنراقب الوضع"
    : final === "NEEDS_RESTAURANT_APPROVAL" ? "المقترح محتاج موافقة المطعم"
    : "بنوصي بحملة";
  const why = `السبب: ${top}.`;
  const sup = superseded.length ? ` تجاوز: ${superseded.map(arLayer).join("، ")}.` : "";
  const sw = switchedTo ? ` البديل الآمن: ${switchedTo}.` : "";
  return `${head}. ${why}${sup}${sw}`;
}

function arLayer(k: string) {
  return {
    restaurant_override: "تجاوز المطعم",
    vertical_playbook: "playbook الفيرتكال",
    daypart_strategy: "استراتيجية الفترة",
    partner_window: "إشارة الشريك",
  }[k] || k;
}

// ===========================================================================
// buildVerticalStrategyContext — normalized VERTICAL INTELLIGENCE INPUT for
// the DemandDecision Engine. Pure, no I/O. Reuses the already safety-applied
// recommendation (`rec` from applySafetyPrecedence) and expands it into a
// structured context with up to 3 ranked CANDIDATE strategies.
//
// ADVISORY ONLY. DemandDecision remains the final authority. This answers
// "WHAT usually works here?" — never "SHOULD we act?". Never exposed to
// Partner/Customer UI (admin-internal only). [Vertical→Demand Bridge §3,4]
// ===========================================================================

const MECHANISM_COMMERCIAL_INTENSITY: Record<string, "low" | "medium" | "high"> = {
  NO_DISCOUNT: "low", VALUE_ADD: "low",
  MIX_VALUE: "medium", POINT_LOCKED: "medium", PLUS_UPSELL: "medium",
  LIMITED_QUANTITY: "medium", FIRST_TRIAL: "medium", TIME_AND_QUANTITY: "medium",
  PERSONALIZED_VALUE: "medium", DIRECT_PRICE: "high", CROSS_RESTAURANT: "medium",
};

export function buildVerticalStrategyContext(args: {
  rec: any; safety?: any; playbooks?: any[]; daypartStrategy?: any;
  vertical?: any; restaurant?: any; previousResults?: any[]; offers?: any[]; missing?: string[];
}): any {
  const { rec, safety, playbooks = [], daypartStrategy, vertical, restaurant, previousResults = [], offers = [], missing = [] } = args;
  const obj = rec?.recommended_objective;
  const noAction = !obj || obj === "NO_ACTION" || obj === "WATCH" || obj === "NEEDS_RESTAURANT_APPROVAL";

  const candidates: any[] = [];
  const seen = new Set<string>();
  const pushCand = (c: any) => {
    const key = `${c.objective}|${c.mechanism}`;
    if (seen.has(key) || candidates.length >= 3) return;
    seen.add(key);
    candidates.push({ rank: candidates.length + 1, ...c });
  };

  if (!noAction && rec?.recommended_mechanic) {
    pushCand({
      objective: obj, mechanism: rec.recommended_mechanic, variant: rec.recommended_tier || null,
      audience_compatibility: rec.recommended_audience || [],
      vertical_rationale: rec._playbookName || "vertical_default",
      commercial_intensity: MECHANISM_COMMERCIAL_INTENSITY[rec.recommended_mechanic] || "medium",
      intervention_cost: null, confidence: rec.confidence_score ?? null, source: "vertical_playbook",
    });
    // alternative matched playbooks
    (playbooks || []).slice(0, 3).forEach((p) => {
      if (p.objective && p.mechanic) pushCand({
        objective: p.objective, mechanism: p.mechanic, variant: rec.recommended_tier || null,
        audience_compatibility: p.audience_segments || [], vertical_rationale: "alt_playbook",
        commercial_intensity: MECHANISM_COMMERCIAL_INTENSITY[p.mechanic] || "medium",
        intervention_cost: null, confidence: rec.confidence_score ?? null, source: "vertical_playbook",
      });
    });
    // minimum-intervention fallback alternatives for the same objective
    ["VALUE_ADD", "POINT_LOCKED", "FIRST_TRIAL", "TIME_AND_QUANTITY"].forEach((m) => pushCand({
      objective: obj, mechanism: m, variant: rec.recommended_tier || null,
      audience_compatibility: rec.recommended_audience || [], vertical_rationale: "min_intervention_fallback",
      commercial_intensity: MECHANISM_COMMERCIAL_INTENSITY[m] || "medium",
      intervention_cost: null, confidence: rec.confidence_score ?? null, source: "vertical_fallback",
    }));
  }

  return {
    primary_vertical_id: restaurant?.primary_vertical_id || null,
    matched_playbook_id: rec?._playbookName || null,
    matched_daypart_strategy_id: daypartStrategy?.id || null,
    restaurant_override_id: safety?.restaurantOverride ? "restaurant_configured" : null,
    _override_mechanism: safety?.restaurantOverride?.mechanic || null,
    recommended_objective: obj || null,
    recommended_mechanisms: candidates.map((c) => c.mechanism),
    compatible_variant_types: [...new Set([...(playbooks || []).flatMap((p) => p.preferred_tiers || []), ...(daypartStrategy?.preferred_tiers || [])])].filter(Boolean),
    compatible_skus: rec?.recommended_restaurant_items || [],
    recommended_windows: safety?.partnerFacts?.recommendedWindows || [],
    recommended_audiences: rec?.recommended_audience || [],
    reason_codes: rec?.reason_codes || [],
    confidence: rec?.confidence_score ?? null,
    source_labels: rec?._source_labels || [],
    missing_data: missing || [],
    precedence_result: rec?._precedence_chain || null,
    candidates,
    restaurant_specific_learning: summarizeVerticalLearning(previousResults),
  };
}

function summarizeVerticalLearning(previousResults: any[]): any {
  const reliable = (previousResults || []).filter((r) => r.result_status === "STRONG" && r.objective && r.mechanism);
  if (!reliable.length) return null;
  const counts: Record<string, { objective: string; mechanism: string; strong: number }> = {};
  for (const r of reliable) {
    const k = `${r.objective}|${r.mechanism}`;
    counts[k] = counts[k] || { objective: r.objective, mechanism: r.mechanism, strong: 0 };
    counts[k].strong++;
  }
  const top = Object.values(counts).sort((a, b) => b.strong - a.strong)[0];
  return top ? { objective: top.objective, mechanism: top.mechanism, strong_count: top.strong, label: "PLAYBOOK_SUPPORTED" } : null;
}