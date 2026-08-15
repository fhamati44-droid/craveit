import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/partnerShared.ts';
import { json } from '../../shared/httpHelpers.ts';
import {
  DEMO_SCENARIOS, DEMO_BATCH, STRATEGY_OBJECTIVE, PRIORITY_SCORE, CONFIDENCE, SAFETY,
} from '../../shared/demandDecisionConfig.ts';
import {
  calcSafeAdditionalCapacity, calcDemandGap, calcDemandState, hardBlockers,
  calcOpportunityScore, decideDemandAction, recommendStrategy, recommendQuota,
  mapDecisionToOpportunityType, generateExplanation, cannibalizationLabel,
  type DecisionInputs,
} from '../../shared/demandDecisionLogic.ts';

// ============================================================================
// demandDecisionEngine — the intelligence layer ABOVE the existing
// Opportunity / Campaign / CampaignOffer / UnifiedOffer system.
// It answers: "Should TAMAM create additional demand?" — and if so, recommends
// a strategy + quota. It does NOT build offers or touch checkout safety.
// Accepted decisions reuse the EXISTING Opportunity entity (mapped to an
// existing opportunity_type) — no second opportunity system.
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
    baseline_orders: inp.baseline_orders,
    projected_natural_orders: inp.projected_natural_orders,
    safe_capacity: inp.safe_capacity,
    existing_campaign_commitment: inp.existing_campaign_commitment,
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
  };
  return { inputs, window_start: iso(startD), window_end: iso(endD), now_ms: nowMs, upcoming };
}

// ---- Build DecisionInputs from REAL data (production path) ----
// Documented fallback heuristics are used where real data is insufficient;
// confidence is reduced accordingly. No fabricated history.
async function buildRealInputs(SR: any, payload: any): Promise<{ inputs: DecisionInputs; window_start: string; window_end: string; now_ms: number; upcoming: boolean }> {
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

  // existing campaign commitment (real) — active/scheduled CampaignOffers for this restaurant overlapping window
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
  const campaignCount = (offers || []).filter((o: any) => !o.is_demo && ['active', 'scheduled'].includes(o.status)).length;

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
  let confidence: number;
  if (comparable.length >= CONFIDENCE.min_sample_size) {
    baseline = comparable.length / Math.max(1, Math.min(8, new Set(comparable.map((o) => new Date(o.updated_date || o.created_date).toDateString())).size));
    confidence = Math.min(0.85, 0.4 + comparable.length * 0.05);
  } else {
    // fallback heuristic: quiet traffic light → low baseline; medium → mid; busy → high. Reduced confidence.
    const fb = trafficLight === 'RED' ? 22 : trafficLight === 'YELLOW' ? 12 : trafficLight === 'GREEN' ? 6 : 8;
    baseline = fb;
    confidence = 0.3;
  }

  // projected natural = baseline + small lift from recent intent (TamamSuggestionClick last 24h for this restaurant)
  const clicks = await SR.entities.TamamSuggestionClick.filter({ restaurant_id: rid }).catch(() => []);
  const recentClicks = (clicks || []).filter((c: any) => now() - new Date(c.created_date).getTime() < 86400000).length;
  const intentLift = Math.min(3, Math.round(recentClicks * 0.2));
  const projected = Math.max(0, Math.round((baseline + intentLift) * 10) / 10);

  // safe capacity: heuristic from operating status + default, reduced by pressure. Surplus uses surplus qty.
  let safeCap = SAFETY.default_safe_capacity;
  if (pressure || trafficLight === 'RED') safeCap = 0;
  else if (trafficLight === 'YELLOW') safeCap = Math.round(SAFETY.default_safe_capacity * 0.6);
  if (surplusQty != null) safeCap = surplusQty;

  // audience — real segment sizes (reuse logic similar to campaignEngine.computeSegments but returns sizes)
  const audience = await findAudience(SR, rid, null);

  // cannibalization: if chosen audience is repeat customers at this window → higher
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

  // commercial safety: if we have an item with a price, check a candidate offer price (heuristic 90% of normal)
  let commercialSafe = true, commercialScore = 0.85, approvalRequired = false;
  if (item && item.price) {
    const floor = item.price * 0.7; // heuristic customer offer floor (would be CommercialGuardrail in full)
    const guardrails = await SR.entities.CommercialGuardrail.filter({ restaurant_id: rid, status: 'active' }).catch(() => []);
    const g = (guardrails || []).find((x: any) => !x.menu_item_id || x.menu_item_id === item.id);
    if (g && g.minimum_customer_offer_price) {
      const candidate = item.price * 0.9;
      commercialSafe = candidate >= g.minimum_customer_offer_price;
      commercialScore = commercialSafe ? 0.9 : 0.3;
      approvalRequired = !commercialSafe;
    }
  }

  // data confidence adjustment
  if (!profile) confidence = Math.min(confidence, 0.4);
  if (!mappingValid) confidence = Math.min(confidence, 0.3);
  const learningMode = comparable.length < CONFIDENCE.min_sample_size;

  // priority
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
    baseline_orders: baseline,
    projected_natural_orders: projected,
    safe_capacity: safeCap,
    existing_campaign_commitment: committed,
    audience_segment: audience.segment,
    audience_size: audience.size,
    audience_intent_score: audience.intent,
    cannibalization_score: cannibalizationScore,
    fatigue_score: fatigueScore,
    operational_risk: pressure ? 0.9 : trafficLight === 'RED' ? 0.8 : trafficLight === 'YELLOW' ? 0.4 : 0.1,
    campaign_saturation: safeCap > 0 ? Math.min(1, committed / safeCap) : 0,
    commercial_safe: commercialSafe,
    commercial_score: commercialScore,
    approval_required: approvalRequired,
    restaurant_priority_score: PRIORITY_SCORE[priority] ?? 0.6,
    urgency_score: surplusQty != null ? 1 : (trafficLight === 'GREEN' ? 0.5 : 0.3),
    data_confidence: confidence,
    learning_mode: learningMode,
    automation_mode: 'MANUAL',
    surplus_qty: surplusQty,
  };
  return { inputs, window_start: iso(new Date(winStart)), window_end: iso(new Date(winEnd)), now_ms: nowMs, upcoming };
}

// ---- Find a real audience segment + size for a restaurant ----
async function findAudience(SR: any, rid: string, phoneHint?: string): Promise<{ segment: string; size: number; intent: number }> {
  // NEW_TO_RESTAURANT: users with clicks but no delivered orders
  const clicks = await SR.entities.TamamSuggestionClick.filter({ restaurant_id: rid }).catch(() => []);
  const orderPhones = new Set(((await SR.entities.RestaurantSubOrder.filter({ restaurant_id: rid, status: 'delivered' }).catch(() => [])) || []).map((o: any) => o.customer_phone).filter(Boolean));
  const clickPhones = new Set((clicks || []).map((c: any) => c.phone).filter(Boolean));
  const newToRest = [...clickPhones].filter((p) => !orderPhones.has(p)).length;

  // LAPSED_30 / LAPSED_60 from order history
  const allOrders = (await SR.entities.RestaurantSubOrder.filter({ restaurant_id: rid, status: 'delivered' }).catch(() => [])) || [];
  const lastByPhone: Record<string, number> = {};
  for (const o of allOrders) {
    const t = o.updated_date ? new Date(o.updated_date).getTime() : (o.created_date ? new Date(o.created_date).getTime() : 0);
    if (!o.customer_phone || !t) continue;
    lastByPhone[o.customer_phone] = Math.max(lastByPhone[o.customer_phone] || 0, t);
  }
  const lapsed30 = Object.values(lastByPhone).filter((t) => { const d = (now() - t) / 86400000; return d >= 30 && d < 60; }).length;
  const lapsed60 = Object.values(lastByPhone).filter((t) => (now() - t) / 86400000 >= 60).length;

  // POINTS_ENGAGED
  const accs = await SR.entities.LoyaltyAccount.list('-balance', 200).catch(() => []);
  const pointsEngaged = (accs || []).filter((a: any) => (a.balance || 0) >= 40).length;

  // choose best segment by size + intent
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
async function runDecision(SR: any, ctx: { inputs: DecisionInputs; window_start: string; window_end: string; now_ms: number; upcoming: boolean; scenario_key?: string; test_time?: string }) {
  const { inputs, window_start, window_end, upcoming, scenario_key, test_time } = ctx;
  const { decision, blockers, score, components, state } = decideDemandAction(inputs, upcoming);
  const rec = recommendStrategy(inputs, decision);
  const { quota, explore_exploit } = recommendQuota(inputs, decision);
  const expl = generateExplanation(inputs, decision, rec, quota, { score, components });
  const cann = cannibalizationLabel(inputs.cannibalization_score);

  const record = {
    restaurant_id: inputs.restaurant_id,
    tamam_product_id: inputs.tamam_product_id ?? null,
    restaurant_item_id: inputs.restaurant_item_id ?? null,
    mealset_variant_id: inputs.mealset_variant_id ?? null,
    window_start, window_end,
    demand_state: state,
    baseline_orders: inputs.baseline_orders,
    projected_natural_orders: inputs.projected_natural_orders,
    safe_additional_capacity: calcSafeAdditionalCapacity(inputs),
    existing_campaign_commitment: inputs.existing_campaign_commitment,
    demand_gap: calcDemandGap(inputs),
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
    explanation_internal: expl.internal,
    explanation_partner: expl.partner,
    scenario_key: scenario_key || '',
    test_time: test_time || '',
    is_demo: !!scenario_key,
    demo_batch_id: scenario_key ? DEMO_BATCH : '',
  };
  return { record, score, components, decision, blockers, rec, quota };
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
      } else {
        ctx = await buildRealInputs(SR, payload);
      }
      const result = await runDecision(SR, ctx);
      // persist the decision record
      const saved = await SR.entities.DemandDecision.create(result.record).catch((e: any) => { console.error('DemandDecision create', e); return null; });
      return json({ data: { ...result.record, id: saved?.id || null, score_components_obj: result.components, expected_match: payload.scenario_key ? matchExpected(payload.scenario_key, result.decision, result.rec.strategy) : null } });
    }

    // ---- run all demo scenarios (checkpoint convenience) ----
    if (action === 'runScenarios') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const out = [];
      for (const scenario of DEMO_SCENARIOS) {
        const ctx = await buildScenarioInputs(SR, scenario);
        ctx.scenario_key = scenario.key;
        const result = await runDecision(SR, ctx);
        out.push({
          key: scenario.key,
          label: scenario.label,
          decision: result.decision,
          opportunity_score: result.score,
          demand_state: result.record.demand_state,
          demand_gap: result.record.demand_gap,
          safe_additional: result.record.safe_additional_capacity,
          recommended_strategy: result.rec.strategy,
          recommended_objective: result.rec.objective,
          recommended_quota: result.quota,
          cannibalization: result.record.cannibalization_risk,
          hard_blockers: result.blockers,
          expected: scenario.expected,
          expected_strategy: scenario.expected_strategy,
          expected_match: matchExpected(scenario.key, result.decision, result.rec.strategy),
          explanation_partner: result.record.explanation_partner,
        });
      }
      return json({ data: out });
    }

    // ---- list / get ----
    if (action === 'listDecisions') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const list = payload?.restaurant_id
        ? await SR.entities.DemandDecision.filter({ restaurant_id: payload.restaurant_id }).catch(() => [])
        : await SR.entities.DemandDecision.list('-created_date', 100).catch(() => []);
      return json({ data: list || [] });
    }
    if (action === 'getDecision') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const d = await SR.entities.DemandDecision.get(payload.id).catch(() => null);
      return json({ data: d });
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

    // ---- list demo scenarios (for future Lab UI) ----
    if (action === 'listScenarios') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      return json({ data: DEMO_SCENARIOS.map((s) => ({ key: s.key, label: s.label, description: s.description, expected: s.expected, expected_strategy: s.expected_strategy })) });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error('demandDecisionEngine error', e);
    return json({ error: e.message || 'server_error' }, 500);
  }
}

function matchExpected(scenarioKey: string, decision: string, strategy: string): { decision_ok: boolean; strategy_ok: boolean } {
  const sc = DEMO_SCENARIOS.find((s) => s.key === scenarioKey);
  if (!sc) return { decision_ok: false, strategy_ok: false };
  const decision_ok = (sc.expected as string[]).includes(decision);
  const strategy_ok = sc.expected_strategy.length === 0 || (strategy && (sc.expected_strategy as string[]).includes(strategy));
  return { decision_ok, strategy_ok };
}