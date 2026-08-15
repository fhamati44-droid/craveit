import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/partnerShared.ts';
import { json } from '../../shared/httpHelpers.ts';
import {
  commercialBreakdown, validateFunding, cappedContributions, AUDIENCE_LABEL_AR,
} from '../../shared/campaignCommerce.ts';
import {
  DEMO_BATCH_EXEC, POLICY_DEFAULTS, GUARDED_DEFAULTS, MECHANISM_POLICY_FLAG,
  EXPLORE_CAPS, VALID_UNTIL, LEARNING, MECHANISM_TO_OFFER_TYPE, OBJECTIVE_TO_CAMPAIGN,
  PLAN_TRANSITIONS, AUDIT_ACTION_AR, MONITOR_STATE_AR, PLAN_STATUS_AR,
} from '../../shared/demandExecutionConfig.ts';

// ============================================================================
// demandExecutionEngine — GUARDED DEMAND EXECUTION (Milestone 3).
// Turns a verified DemandDecision into a safe campaign action inside strict
// pre-agreed boundaries. It does NOT replace the decision/opportunity/campaign
// pipeline — it orchestrates on top of the existing entities:
//   DemandDecision -> (generatePlan) -> CampaignPlan
//     -> (schedulePlan) -> Opportunity + Campaign
//     -> (activatePlan: pre-activation revalidation) -> CampaignOffer (ACTIVE)
//     -> (reevaluateActive) -> PAUSE / RESUME / COMPLETE
//     -> (completeCampaign) -> CampaignLearning
// Execution Policy controls AUTOMATION. CommercialGuardrail controls COMMERCIAL
// PERMISSION. They work together but never overlap.
// ============================================================================

function now() { return Date.now(); }
function iso(d: Date) { return d.toISOString(); }
function round2(n: number) { return Math.round((n || 0) * 100) / 100; }

// ---- offerStatus mirror (campaignEngine) for reevaluation ----
function offerStatus(o: any, nowMs?: number): string {
  const start = o.start_at ? new Date(o.start_at).getTime() : 0;
  const end = o.end_at ? new Date(o.end_at).getTime() : Infinity;
  const t = nowMs != null ? nowMs : now();
  if (o.status === 'paused' || o.status === 'completed') return o.status;
  if (t < start) return 'scheduled';
  if (t >= end) return 'expired';
  const total = o.quota_total == null ? null : o.quota_total;
  if (total != null && (o.quota_used || 0) >= total) return 'sold_out';
  return 'active';
}

async function getDemoRestaurant(SR: any) {
  const list = await SR.entities.Restaurant.filter({ is_demo: true, demo_batch_id: 'tamam-demo-partner-v1' }).catch(() => []);
  return (list || [])[0] || null;
}

// ============================================================================
// AUDIT
// ============================================================================
async function audit(SR: any, entry: any) {
  try {
    await SR.entities.ExecutionAuditLog.create({
      plan_id: entry.plan_id || '',
      campaign_id: entry.campaign_id || '',
      demand_decision_id: entry.demand_decision_id || '',
      restaurant_id: entry.restaurant_id || '',
      actor: entry.actor || 'system',
      action: entry.action,
      reason: entry.reason || '',
      old_state: entry.old_state || '',
      new_state: entry.new_state || '',
      is_demo: !!entry.is_demo,
      demo_batch_id: entry.demo_batch_id || DEMO_BATCH_EXEC,
    });
  } catch (e) { console.error('audit fail', e); }
}

// ============================================================================
// EXECUTION POLICY
// ============================================================================
async function ensurePolicy(SR: any, rid: string): Promise<any> {
  const existing = await SR.entities.DemandExecutionPolicy.filter({ restaurant_id: rid }).catch(() => []);
  if (existing && existing[0]) return existing[0];
  return SR.entities.DemandExecutionPolicy.create({ restaurant_id: rid, ...POLICY_DEFAULTS });
}

// ============================================================================
// GLOBAL AUTOMATION CONTROL (kill switch) — singleton
// ============================================================================
async function getControl(SR: any): Promise<any> {
  const list = await SR.entities.AutomationControl.filter({ key: 'global' }).catch(() => []);
  if (list && list[0]) return list[0];
  return SR.entities.AutomationControl.create({ key: 'global', paused: false, reason: '' });
}

// ============================================================================
// DECISION EXPIRATION (section 7)
// ============================================================================
function computeValidUntil(dd: any, baseMs?: number): string {
  const t = baseMs != null ? baseMs : now();
  const winStart = dd.window_start ? new Date(dd.window_start).getTime() : t;
  if (dd.decision === 'ACT_NOW' || (dd.urgency_score || 0) >= 0.9) {
    return iso(new Date(t + VALID_UNTIL.act_now_minutes * 60000));
  }
  if (dd.decision === 'SCHEDULE' || dd.decision === 'PREPARE') {
    const until = winStart - VALID_UNTIL.scheduled_buffer_minutes * 60000;
    if (until > t) return iso(new Date(until));
  }
  return iso(new Date(t + VALID_UNTIL.default_minutes * 60000));
}

function decisionExpired(dd: any, evalMs: number): boolean {
  if (!dd.valid_until) return false;
  return evalMs > new Date(dd.valid_until).getTime();
}

// ============================================================================
// SAFETY GATE (section 5 + 6 pre-activation revalidation)
// Deterministic. Every check returns pass/fail + reason. Any hard fail blocks.
// ============================================================================
async function runSafetyGate(SR: any, plan: any, dd: any, policy: any, evalMs: number): Promise<{
  pass: boolean; checks: any; approval_required: boolean; kill_reason: string;
}> {
  const checks: Record<string, { ok: boolean; reason: string }> = {};
  let hardFail = false;
  let approvalRequired = false;
  let killReason = '';

  // decision_valid
  const decisionActionable = !['NO_ACTION', 'NEEDS_HUMAN_REVIEW'].includes(dd.decision);
  checks.decision_valid = { ok: decisionActionable && !decisionExpired(dd, evalMs), reason: !decisionActionable ? 'decision_not_actionable' : (decisionExpired(dd, evalMs) ? 'decision_expired' : 'ok') };

  // restaurant state
  const rest = await SR.entities.Restaurant.get(plan.restaurant_id).catch(() => null);
  const restaurantOpen = !!(rest && rest.current_status === 'open' && rest.accepts_orders);
  const restaurantBusy = !!rest && (rest.current_status === 'busy' || rest.current_status === 'temporarily_unavailable');
  checks.restaurant_open = { ok: restaurantOpen, reason: restaurantOpen ? 'ok' : 'restaurant_closed' };

  const sigs = await SR.entities.RestaurantOperationalSignal.filter({ restaurant_id: plan.restaurant_id, status: 'active' }).catch(() => []);
  const pressure = (sigs || []).some((s: any) => s.type === 'kitchen_pressure' || s.type === 'temporary_pause');
  checks.no_pressure = { ok: !pressure && !restaurantBusy, reason: pressure ? 'restaurant_pressure' : (restaurantBusy ? 'restaurant_busy' : 'ok') };

  // item availability + mapping
  let item: any = null;
  if (dd.restaurant_item_id) item = await SR.entities.RestaurantMealOffer.get(dd.restaurant_item_id).catch(() => null);
  const itemAvailable = item ? (item.active && item.available && !item.sold_out) : true;
  checks.item_available = { ok: itemAvailable, reason: itemAvailable ? 'ok' : 'item_unavailable' };
  const mappingValid = item ? !!item.mapped_tamam_product_id : !!dd.tamam_product_id;
  checks.product_mapping_valid = { ok: mappingValid, reason: mappingValid ? 'ok' : 'invalid_mapping' };

  // capacity (reuse dd's safe_additional_capacity / safe_operational_target)
  const safeAdditional = Math.max(0, dd.safe_additional_capacity ?? 0);
  const target = dd.safe_operational_target ?? 0;
  checks.safe_capacity_positive = { ok: safeAdditional > 0 || (dd.recommended_objective === 'SURPLUS' && (dd.demand_gap || 0) > 0), reason: safeAdditional > 0 ? 'ok' : 'no_safe_capacity' };
  const quota = plan.planned_quota ?? 0;
  const capForQuota = dd.recommended_objective === 'SURPLUS' ? (dd.safe_operational_target || 0) : safeAdditional;
  checks.quota_within_capacity = { ok: quota > 0 && quota <= capForQuota, reason: quota <= capForQuota ? 'ok' : 'quota_exceeds_capacity' };

  // commercial guardrails
  const guardrails = await SR.entities.CommercialGuardrail.filter({ restaurant_id: plan.restaurant_id, status: 'active' }).catch(() => []);
  const g = (guardrails || []).find((x: any) => !x.menu_item_id || (item && x.menu_item_id === item.id));
  let commercialOk = dd.commercial_safe !== false;
  let commercialReason = 'ok';
  if (g && plan.customer_price != null) {
    if (g.minimum_customer_offer_price != null && plan.customer_price < g.minimum_customer_offer_price) { commercialOk = false; commercialReason = 'below_customer_floor'; }
    if (g.minimum_restaurant_net != null) {
      const bd = commercialBreakdown({ normal_price: plan.normal_reference_price, customer_price: plan.customer_price, restaurant_contribution: plan.restaurant_contribution, tamam_contribution: plan.tamam_contribution });
      if (bd.restaurant_settlement < g.minimum_restaurant_net) { commercialOk = false; commercialReason = 'below_restaurant_net'; }
    }
  }
  if (!commercialOk && commercialReason === 'ok') commercialReason = 'commercial_unsafe';
  checks.commercial_guardrails = { ok: commercialOk, reason: commercialReason };
  if (!commercialOk) approvalRequired = true;

  // policy permits mechanism
  const flag = MECHANISM_POLICY_FLAG[plan.mechanism] || 'value_add_allowed';
  const mechAllowed = flag === 'value_add_allowed' ? true : (policy[flag] !== false);
  checks.policy_permits_mechanism = { ok: mechAllowed, reason: mechAllowed ? 'ok' : `mechanism_${plan.mechanism}_blocked` };

  // score + confidence thresholds
  checks.score_above_threshold = { ok: (dd.opportunity_score || 0) >= (policy.minimum_opportunity_score || 0), reason: (dd.opportunity_score || 0) >= (policy.minimum_opportunity_score || 0) ? 'ok' : 'score_below_threshold' };
  checks.confidence_above_threshold = { ok: (dd.data_confidence_score || 0) >= (policy.minimum_confidence || 0), reason: (dd.data_confidence_score || 0) >= (policy.minimum_confidence || 0) ? 'ok' : 'confidence_below_threshold' };
  if ((dd.data_confidence_score || 0) < (policy.minimum_confidence || 0)) approvalRequired = true;

  // fatigue
  checks.fatigue_acceptable = { ok: (dd.campaign_fatigue_score || 0) < 0.7, reason: (dd.campaign_fatigue_score || 0) < 0.7 ? 'ok' : 'campaign_fatigue_high' };

  // conflicting offer (same restaurant/item/variant/audience/time overlap)
  const conflict = await findConflictingOffer(SR, plan, evalMs);
  checks.no_conflicting_offer = { ok: !conflict, reason: conflict ? 'conflicting_offer' : 'ok' };

  // contribution limits
  checks.tamam_contribution_within_limit = { ok: (plan.tamam_contribution || 0) <= (policy.max_tamam_contribution || 0) || plan.mechanism === 'NO_DISCOUNT', reason: (plan.tamam_contribution || 0) <= (policy.max_tamam_contribution || 0) ? 'ok' : 'tamam_contribution_exceeds_limit' };
  if ((plan.tamam_contribution || 0) > (policy.max_tamam_contribution || 0) && plan.mechanism !== 'NO_DISCOUNT') approvalRequired = true;
  checks.restaurant_contribution_within_limit = { ok: (plan.restaurant_contribution || 0) <= (policy.max_restaurant_contribution || 0) || plan.mechanism === 'NO_DISCOUNT', reason: (plan.restaurant_contribution || 0) <= (policy.max_restaurant_contribution || 0) ? 'ok' : 'restaurant_contribution_exceeds_limit' };
  if ((plan.restaurant_contribution || 0) > (policy.max_restaurant_contribution || 0) && plan.mechanism !== 'NO_DISCOUNT') approvalRequired = true;

  // time window relevant
  const winEnd = plan.end_at ? new Date(plan.end_at).getTime() : Infinity;
  const winStart = plan.start_at ? new Date(plan.start_at).getTime() : 0;
  checks.time_window_relevant = { ok: evalMs < winEnd, reason: evalMs < winEnd ? 'ok' : 'window_ended' };

  // audience valid
  checks.audience_valid = { ok: !!(plan.audience_segment) && (plan.audience_size > 0 || plan.mechanism === 'PERSONALIZED_VALUE'), reason: plan.audience_segment ? 'ok' : 'no_audience' };

  // simultaneous campaign load
  const activeCount = await countActiveCampaigns(SR, plan.restaurant_id, evalMs, plan.campaign_id || '');
  checks.simultaneous_campaign_load = { ok: activeCount < (policy.max_simultaneous_campaigns || 2), reason: activeCount < (policy.max_simultaneous_campaigns || 2) ? 'ok' : 'max_simultaneous_reached' };

  // aggregate
  for (const k of Object.keys(checks)) {
    if (!checks[k].ok && ['decision_valid', 'restaurant_open', 'no_pressure', 'item_available', 'product_mapping_valid', 'commercial_guardrails', 'policy_permits_mechanism', 'no_conflicting_offer', 'time_window_relevant'].includes(k)) {
      hardFail = true;
      if (!killReason) killReason = checks[k].reason;
    }
  }

  return { pass: !hardFail && !approvalRequired, checks, approval_required: approvalRequired, kill_reason: killReason || (approvalRequired ? 'approval_required' : '') };
}

async function findConflictingOffer(SR: any, plan: any, evalMs: number): Promise<any | null> {
  if (!plan.restaurant_id) return null;
  const offers = await SR.entities.CampaignOffer.filter({ restaurant_id: plan.restaurant_id }).catch(() => []);
  const pStart = plan.start_at ? new Date(plan.start_at).getTime() : 0;
  const pEnd = plan.end_at ? new Date(plan.end_at).getTime() : Infinity;
  for (const o of (offers || [])) {
    if (o.is_demo) continue; // demo offers are test scaffolding — only real offers conflict in production
    const oStart = o.start_at ? new Date(o.start_at).getTime() : 0;
    const oEnd = o.end_at ? new Date(o.end_at).getTime() : Infinity;
    if (pEnd <= oStart || pStart >= oEnd) continue; // no time overlap
    const sameItem = !plan.restaurant_item_id || !o.restaurant_item_id || o.restaurant_item_id === plan.restaurant_item_id;
    const sameVariant = !plan.variant || !o.mealset_variant_id || o.mealset_variant_id === plan.variant;
    if (sameItem && sameVariant) return o;
  }
  return null;
}

async function countActiveCampaigns(SR: any, rid: string, evalMs: number, excludeCampaignId: string): Promise<number> {
  const camps = await SR.entities.Campaign.filter({ restaurant_id: rid }).catch(() => []);
  let n = 0;
  for (const c of (camps || [])) {
    if (c.id === excludeCampaignId) continue;
    if (c.is_demo) continue; // demo seed campaigns are scaffolding — only real campaigns count toward load
    if (!['ACTIVE', 'SCHEDULED'].includes(c.status)) continue;
    const end = c.end_at ? new Date(c.end_at).getTime() : Infinity;
    if (evalMs < end) n++;
  }
  return n;
}

// ============================================================================
// BUILD OFFER PAYLOAD (mirrors campaignEngine.createOffer + cappedContributions)
// ============================================================================
function buildOfferPayload(plan: any, dd: any, finalQuota: number): any {
  const offerType = MECHANISM_TO_OFFER_TYPE[plan.mechanism] || 'STANDARD_VALUE';
  const contributions = cappedContributions(plan.normal_reference_price || 0, plan.customer_price || 0);
  const restaurant_contribution = plan.restaurant_contribution ?? contributions.restaurant_contribution;
  const tamam_contribution = plan.tamam_contribution ?? contributions.tamam_contribution;
  return {
    campaign_id: plan.campaign_id || '',
    restaurant_id: plan.restaurant_id,
    offer_title: plan.plan_reason_ar || 'عرض TAMAM',
    offer_type: offerType,
    restaurant_item_id: dd.restaurant_item_id || '',
    mealset_variant_id: plan.variant || '',
    tamam_product_id: dd.tamam_product_id || null,
    customer_price: plan.customer_price,
    normal_reference_price: plan.normal_reference_price,
    value_add_description: plan.value_add_description || '',
    start_at: plan.start_at,
    end_at: plan.end_at,
    quota_total: finalQuota,
    quota_used: 0,
    unlock_type: plan.mechanism === 'POINT_LOCKED' ? 'point_locked' : 'none',
    unlock_points: plan.mechanism === 'POINT_LOCKED' ? (dd.unlock_points || 40) : 0,
    audience_rule: plan.audience_segment ? [plan.audience_segment] : ['public'],
    audience_size: plan.audience_size || 0,
    target_user_ids: plan.target_user_ids || [],
    status: 'active',
    priority: 0,
    channels: ['home', 'mood_game', 'offers'],
    restaurant_contribution,
    tamam_contribution,
    is_demo: plan.is_demo,
    demo_batch_id: plan.demo_batch_id || DEMO_BATCH_EXEC,
  };
}

// ============================================================================
// PLAN REASON (partner-facing Arabic, no raw scores)
// ============================================================================
function buildPlanReasonAr(plan: any, dd: any): string {
  const obj = AUDIENCE_LABEL_AR[plan.audience_segment] || 'جمهور مناسب';
  const mech = plan.mechanism === 'FIRST_TRIAL' ? `ميكس لتجربة أولى بـ ${plan.customer_price} ₪`
    : plan.mechanism === 'TIME_AND_QUANTITY' ? `عرض وقت وكمية بـ ${plan.customer_price} ₪`
    : plan.mechanism === 'PERSONALIZED_VALUE' ? `قيمة شخصية لزبون واحد`
    : plan.mechanism === 'POINT_LOCKED' ? `عرض بالنقاط بـ ${plan.customer_price} ₪`
    : plan.mechanism === 'VALUE_ADD' ? `قيمة مضافة بدون حرق سعر`
    : plan.mechanism === 'NO_DISCOUNT' ? `إبراز الوجبة بدون خصم`
    : `عرض بـ ${plan.customer_price} ₪`;
  return `الهدف: ${dd.recommended_objective || ''}. الجمهور: ${obj}. ${mech}. الحد: ${plan.planned_quota} طلب.`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export default async function (req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const SR = base44.asServiceRole;
    const { action, payload } = await req.json();
    const admin = await requireAdmin(base44);
    const isAdmin = !!admin;
    const evalMs = payload.test_time ? new Date(payload.test_time).getTime() : now();

    // ---------- POLICY ----------
    if (action === 'getPolicy') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      return json({ data: await ensurePolicy(SR, payload.restaurant_id) });
    }
    if (action === 'updatePolicy') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const p = await ensurePolicy(SR, payload.restaurant_id);
      const updates: any = {};
      for (const k of Object.keys(payload.changes || {})) {
        if (k !== 'restaurant_id' && k !== 'id') updates[k] = payload.changes[k];
      }
      const updated = await SR.entities.DemandExecutionPolicy.update(p.id, updates).catch(() => null);
      await audit(SR, { restaurant_id: payload.restaurant_id, actor: admin?.id || 'admin', action: 'manual_override', reason: 'policy_update', old_state: p.automation_mode, new_state: updates.automation_mode || p.automation_mode });
      return json({ data: updated });
    }
    if (action === 'setGuardedDemoPolicy') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const p = await ensurePolicy(SR, payload.restaurant_id);
      const updated = await SR.entities.DemandExecutionPolicy.update(p.id, { ...GUARDED_DEFAULTS }).catch(() => null);
      return json({ data: updated });
    }

    // ---------- GLOBAL KILL SWITCH ----------
    if (action === 'getAutomationControl') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      return json({ data: await getControl(SR) });
    }
    if (action === 'setAutomationControl') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const c = await getControl(SR);
      const updated = await SR.entities.AutomationControl.update(c.id, { paused: !!payload.paused, reason: payload.reason || '', paused_by: admin?.id || 'admin', paused_at: iso(new Date()) }).catch(() => null);
      if (payload.paused) await audit(SR, { actor: admin?.id || 'admin', action: 'kill_switch_triggered', reason: payload.reason || 'global_pause' });
      return json({ data: updated });
    }

    // ---------- GENERATE PLAN ----------
    if (action === 'generatePlan') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const dd = await SR.entities.DemandDecision.get(payload.demand_decision_id).catch(() => null);
      if (!dd) return json({ error: 'demand_decision_not_found' }, 404);

      // IDEMPOTENCY: existing non-terminal plan for this decision
      const existing = await SR.entities.CampaignPlan.filter({ demand_decision_id: dd.id }).catch(() => []);
      const live = (existing || []).find((p: any) => !['CANCELLED', 'REJECTED', 'COMPLETED'].includes(p.status));
      if (live) return json({ data: { id: live.id, status: live.status, idempotent: true, plan: live } });

      const policy = await ensurePolicy(SR, dd.restaurant_id);
      const isDemo = dd.is_demo;
      const batch = dd.demo_batch_id || DEMO_BATCH_EXEC;

      // NO_ACTION / NEEDS_HUMAN_REVIEW -> REJECTED, nothing created
      if (['NO_ACTION', 'NEEDS_HUMAN_REVIEW'].includes(dd.decision)) {
        const plan = await SR.entities.CampaignPlan.create({
          demand_decision_id: dd.id, restaurant_id: dd.restaurant_id,
          status: 'REJECTED', kill_reason: dd.decision === 'NO_ACTION' ? 'no_action_creates_nothing' : 'needs_human_review',
          objective: dd.recommended_objective || '', mechanism: dd.recommended_strategy || '', variant: dd.recommended_variant || '',
          audience_segment: dd.audience_segment, audience_size: dd.audience_size,
          start_at: dd.window_start, end_at: dd.window_end,
          is_demo: isDemo, demo_batch_id: batch, execution_mode: 'MANUAL', automation_mode_snapshot: policy.automation_mode,
        });
        await audit(SR, { plan_id: plan.id, demand_decision_id: dd.id, restaurant_id: dd.restaurant_id, actor: admin?.id || 'admin', action: 'plan_rejected', reason: plan.kill_reason, is_demo: isDemo });
        return json({ data: { ...plan, id: plan.id, status: 'REJECTED', created_nothing: true } });
      }

      // ensure valid_until on the decision (computed relative to eval time, not real now)
      if (!dd.valid_until) {
        const vu = computeValidUntil(dd, evalMs);
        await SR.entities.DemandDecision.update(dd.id, { valid_until: vu }).catch(() => null);
        dd.valid_until = vu;
      }

      // ensure Opportunity exists (mirror acceptDecision)
      let opportunityId = dd.created_opportunity_id || '';
      if (!opportunityId) {
        const oppType = dd.recommended_objective === 'SURPLUS' ? 'surplus'
          : dd.recommended_objective === 'NEW_CUSTOMERS' ? 'new_customers'
          : dd.recommended_objective === 'REACTIVATION' ? 'reactivation'
          : dd.recommended_objective === 'LOYALTY_ENGAGEMENT' ? 'loyalty_engagement'
          : dd.recommended_objective === 'STRENGTHEN_ITEM' ? 'strengthen_item'
          : 'low_demand';
        const opp = await SR.entities.Opportunity.create({
          restaurant_id: dd.restaurant_id, opportunity_type: oppType,
          related_menu_item_ids: dd.restaurant_item_id ? [dd.restaurant_item_id] : [],
          start_at: dd.window_start, end_at: dd.window_end,
          capacity: dd.recommended_quota || null,
          priority: dd.recommended_objective === 'SURPLUS' ? 'SURPLUS' : dd.recommended_objective === 'STRENGTHEN_ITEM' ? 'STRENGTHEN' : 'NORMAL',
          reason: `Generated by Demand Decision Engine (score ${dd.opportunity_score}, ${dd.decision}). ${dd.explanation_partner || ''}`,
          source: 'tamam_admin', status: 'NEW', demand_decision_id: dd.id,
          is_demo: isDemo, demo_batch_id: batch,
        });
        opportunityId = opp.id;
        await SR.entities.DemandDecision.update(dd.id, { created_opportunity_id: opp.id }).catch(() => null);
        await audit(SR, { plan_id: '', demand_decision_id: dd.id, restaurant_id: dd.restaurant_id, actor: 'system', action: 'decision_accepted', is_demo: isDemo });
        await audit(SR, { plan_id: '', campaign_id: '', demand_decision_id: dd.id, restaurant_id: dd.restaurant_id, actor: 'system', action: 'opportunity_created', reason: opp.id, is_demo: isDemo });
      }

      // build plan
      let plannedQuota = Math.max(0, Math.floor(dd.recommended_quota || 0));
      if (dd.learning_mode) plannedQuota = Math.min(plannedQuota, policy.learning_mode_order_cap || EXPLORE_CAPS.max_orders);
      // EXPLORE hard caps
      if (dd.explore_exploit === 'EXPLORE' || dd.learning_mode) {
        plannedQuota = Math.min(plannedQuota, EXPLORE_CAPS.max_orders);
      }
      const normalPrice = dd.expected_incremental_revenue ? null : null; // resolved below
      // resolve normal/customer price from decision or item
      const item = dd.restaurant_item_id ? await SR.entities.RestaurantMealOffer.get(dd.restaurant_item_id).catch(() => null) : null;
      const normalRef = (item && item.price) ? Number(item.price) : (dd.expected_incremental_revenue ? 59 : 59);
      // heuristic customer price: surplus/first_trial mix ~ 51, value_add ~ normal, point_locked ~ 51
      let customerPrice = normalRef;
      if (dd.recommended_strategy === 'FIRST_TRIAL' || dd.recommended_strategy === 'TIME_AND_QUANTITY' || dd.recommended_strategy === 'POINT_LOCKED') customerPrice = Math.round(normalRef * 0.87 * 100) / 100;
      if (dd.recommended_strategy === 'VALUE_ADD' || dd.recommended_strategy === 'NO_DISCOUNT') customerPrice = normalRef;
      const contributions = cappedContributions(normalRef, customerPrice);
      const restaurant_contribution = contributions.restaurant_contribution;
      const tamam_contribution = contributions.tamam_contribution;
      const bd = commercialBreakdown({ normal_price: normalRef, customer_price: customerPrice, restaurant_contribution, tamam_contribution });

      const executionMode = policy.automation_mode === 'MANUAL' ? 'MANUAL' : 'AUTO_WITHIN_GUARDRAILS';
      const plan = await SR.entities.CampaignPlan.create({
        demand_decision_id: dd.id, opportunity_id: opportunityId, restaurant_id: dd.restaurant_id,
        objective: dd.recommended_objective || '', mechanism: dd.recommended_strategy || '', variant: dd.recommended_variant || '',
        audience_segment: dd.audience_segment, audience_size: dd.audience_size,
        audience_definition_json: JSON.stringify({ segment: dd.audience_segment, estimated_size: dd.audience_size, eligibility_rule: 'UnifiedOffer_eval', target_user_ids: [] }),
        target_user_ids: [],
        start_at: dd.window_start, end_at: dd.window_end,
        planned_quota: plannedQuota, final_quota: plannedQuota,
        customer_price: customerPrice, normal_reference_price: normalRef,
        value_add_description: dd.recommended_strategy === 'VALUE_ADD' ? 'قيمة مضافة بدون حرق سعر' : '',
        tamam_contribution, restaurant_contribution,
        expected_settlement: bd.restaurant_settlement,
        expected_incremental_orders: dd.expected_incremental_orders || 0,
        expected_tamam_contribution_cost: dd.expected_tamam_contribution_cost || 0,
        execution_mode: executionMode, automation_mode_snapshot: policy.automation_mode,
        explore_exploit: dd.explore_exploit || 'EXPLOIT', learning_mode: !!dd.learning_mode,
        status: 'VALIDATING', safety_gate_json: '', monitor_state: 'UNKNOWN',
        campaign_id: '', campaign_offer_id: '', plan_reason_ar: '', kill_reason: '',
        test_time: payload.test_time || '', is_demo: isDemo, demo_batch_id: batch,
      });
      await audit(SR, { plan_id: plan.id, demand_decision_id: dd.id, restaurant_id: dd.restaurant_id, actor: admin?.id || 'admin', action: 'plan_generated', is_demo: isDemo });

      // run safety gate
      const gate = await runSafetyGate(SR, plan, dd, policy, evalMs);
      let status = 'READY';
      if (!gate.pass && gate.approval_required) status = 'APPROVAL_REQUIRED';
      else if (!gate.pass) status = 'REJECTED';
      const reason = buildPlanReasonAr(plan, dd);
      const updated = await SR.entities.CampaignPlan.update(plan.id, {
        status, safety_gate_json: JSON.stringify(gate.checks), kill_reason: gate.kill_reason, plan_reason_ar: reason,
      });
      await audit(SR, { plan_id: plan.id, demand_decision_id: dd.id, restaurant_id: dd.restaurant_id, actor: 'system', action: status === 'READY' ? 'validation_pass' : (status === 'APPROVAL_REQUIRED' ? 'approval_requested' : 'plan_rejected'), reason: gate.kill_reason, old_state: 'VALIDATING', new_state: status, is_demo: isDemo });
      return json({ data: { ...updated, id: plan.id, status, safety_gate: gate, idempotent: false } });
    }

    // ---------- VALIDATE PLAN ----------
    if (action === 'validatePlan') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const plan = await SR.entities.CampaignPlan.get(payload.plan_id).catch(() => null);
      if (!plan) return json({ error: 'plan_not_found' }, 404);
      const dd = await SR.entities.DemandDecision.get(plan.demand_decision_id).catch(() => null);
      const policy = await ensurePolicy(SR, plan.restaurant_id);
      const gate = await runSafetyGate(SR, plan, dd, policy, evalMs);
      let status = 'READY';
      if (!gate.pass && gate.approval_required) status = 'APPROVAL_REQUIRED';
      else if (!gate.pass) status = 'REJECTED';
      const updated = await SR.entities.CampaignPlan.update(plan.id, { status, safety_gate_json: JSON.stringify(gate.checks), kill_reason: gate.kill_reason });
      await audit(SR, { plan_id: plan.id, restaurant_id: plan.restaurant_id, actor: admin?.id || 'admin', action: gate.pass ? 'validation_pass' : (gate.approval_required ? 'approval_requested' : 'validation_fail'), reason: gate.kill_reason, old_state: plan.status, new_state: status, is_demo: plan.is_demo });
      return json({ data: { id: plan.id, status, safety_gate: gate, plan: updated } });
    }

    // ---------- SCHEDULE PLAN (guarded auto-schedule) ----------
    if (action === 'schedulePlan') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const plan = await SR.entities.CampaignPlan.get(payload.plan_id).catch(() => null);
      if (!plan) return json({ error: 'plan_not_found' }, 404);
      if (!['READY', 'APPROVAL_REQUIRED'].includes(plan.status)) return json({ error: 'plan_not_ready', status: plan.status }, 400);
      const dd = await SR.entities.DemandDecision.get(plan.demand_decision_id).catch(() => null);
      const policy = await ensurePolicy(SR, plan.restaurant_id);
      const control = await getControl(SR);

      // global kill switch blocks new auto-activations only
      if (control.paused && policy.automation_mode !== 'MANUAL') {
        return json({ data: { id: plan.id, scheduled: false, reason: 'global_kill_switch_active' } });
      }
      // re-validate at schedule time
      const gate = await runSafetyGate(SR, plan, dd, policy, evalMs);
      if (!gate.pass) {
        const status = gate.approval_required ? 'APPROVAL_REQUIRED' : 'REJECTED';
        await SR.entities.CampaignPlan.update(plan.id, { status, safety_gate_json: JSON.stringify(gate.checks), kill_reason: gate.kill_reason });
        await audit(SR, { plan_id: plan.id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'validation_fail', reason: gate.kill_reason, old_state: plan.status, new_state: status, is_demo: plan.is_demo });
        return json({ data: { id: plan.id, scheduled: false, status, safety_gate: gate } });
      }
      // guarded auto-schedule only if policy permits; manual schedule always allowed (admin action)
      const autoOk = policy.automation_mode !== 'MANUAL' && policy.auto_schedule_allowed;
      // create Campaign (mirror convertOpportunity)
      let campaignId = plan.campaign_id || '';
      if (!campaignId) {
        const camp = await SR.entities.Campaign.create({
          restaurant_id: plan.restaurant_id,
          campaign_name: plan.plan_reason_ar || 'حملة من خطة TAMAM',
          objective: OBJECTIVE_TO_CAMPAIGN[plan.objective] || plan.objective || 'ACQUISITION',
          status: 'SCHEDULED',
          start_at: plan.start_at, end_at: plan.end_at,
          primary_audience: plan.audience_segment ? [plan.audience_segment] : [],
          source_opportunity_id: plan.opportunity_id || '',
          linked_offer_ids: [], channels: ['home', 'mood_game', 'offers'],
          internal_notes: 'Created from CampaignPlan ' + plan.id,
          is_demo: plan.is_demo, demo_batch_id: plan.demo_batch_id || DEMO_BATCH_EXEC,
        });
        campaignId = camp.id;
        if (plan.opportunity_id) await SR.entities.Opportunity.update(plan.opportunity_id, { status: 'USED', linked_campaign_id: camp.id }).catch(() => null);
      }
      await SR.entities.CampaignPlan.update(plan.id, { status: 'SCHEDULED', campaign_id: campaignId, safety_gate_json: JSON.stringify(gate.checks) });
      await audit(SR, { plan_id: plan.id, campaign_id: campaignId, restaurant_id: plan.restaurant_id, actor: autoOk ? 'automation' : (admin?.id || 'admin'), action: 'campaign_scheduled', old_state: plan.status, new_state: 'SCHEDULED', is_demo: plan.is_demo });
      return json({ data: { id: plan.id, scheduled: true, campaign_id: campaignId, auto: autoOk, status: 'SCHEDULED' } });
    }

    // ---------- ACTIVATE PLAN (pre-activation revalidation) ----------
    if (action === 'activatePlan') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const plan = await SR.entities.CampaignPlan.get(payload.plan_id).catch(() => null);
      if (!plan) return json({ error: 'plan_not_found' }, 404);
      if (!['SCHEDULED', 'READY'].includes(plan.status)) return json({ error: 'plan_not_schedulable', status: plan.status }, 400);
      const dd = await SR.entities.DemandDecision.get(plan.demand_decision_id).catch(() => null);
      const policy = await ensurePolicy(SR, plan.restaurant_id);
      const control = await getControl(SR);

      // PRE-ACTIVATION REVALIDATION
      const gate = await runSafetyGate(SR, plan, dd, policy, evalMs);
      if (control.paused && policy.automation_mode !== 'MANUAL') {
        await SR.entities.CampaignPlan.update(plan.id, { status: 'READY', monitor_state: 'NEEDS_REVIEW', kill_reason: 'global_kill_switch_active' });
        await audit(SR, { plan_id: plan.id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'kill_switch_triggered', reason: 'global_pause_blocks_activation', is_demo: plan.is_demo });
        return json({ data: { id: plan.id, outcome: 'NEEDS_REVIEW', reason: 'global_kill_switch_active' } });
      }
      if (!gate.pass && !gate.approval_required) {
        const reason = gate.kill_reason || 'safety_gate_failed';
        // operational block -> CANCEL if window ended, else NEEDS_REVIEW/DELAY
        const winEnd = plan.end_at ? new Date(plan.end_at).getTime() : Infinity;
        const outcome = evalMs >= winEnd ? 'CANCEL' : 'DELAY';
        if (outcome === 'CANCEL') {
          await SR.entities.CampaignPlan.update(plan.id, { status: 'CANCELLED', monitor_state: 'NEEDS_REVIEW', kill_reason: reason });
          await audit(SR, { plan_id: plan.id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'plan_cancelled', reason, old_state: plan.status, new_state: 'CANCELLED', is_demo: plan.is_demo });
        }
        return json({ data: { id: plan.id, outcome, reason, safety_gate: gate } });
      }
      if (gate.approval_required) {
        await SR.entities.CampaignPlan.update(plan.id, { status: 'APPROVAL_REQUIRED', safety_gate_json: JSON.stringify(gate.checks), kill_reason: gate.kill_reason });
        await audit(SR, { plan_id: plan.id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'approval_requested', reason: gate.kill_reason, old_state: plan.status, new_state: 'APPROVAL_REQUIRED', is_demo: plan.is_demo });
        return json({ data: { id: plan.id, outcome: 'NEEDS_REVIEW', reason: gate.kill_reason, safety_gate: gate } });
      }

      // REDUCE_QUOTA if planned > current safe capacity (never increase)
      const safeAdditional = Math.max(0, dd.safe_additional_capacity ?? 0);
      const capForQuota = dd.recommended_objective === 'SURPLUS' ? (dd.safe_operational_target || 0) : safeAdditional;
      let finalQuota = plan.planned_quota;
      let outcome = 'ACTIVATE';
      if (finalQuota > capForQuota && capForQuota > 0) {
        finalQuota = Math.max(1, Math.floor(capForQuota));
        outcome = 'REDUCE_QUOTA';
      }
      if (finalQuota <= 0) {
        await SR.entities.CampaignPlan.update(plan.id, { status: 'CANCELLED', kill_reason: 'no_capacity_at_activation' });
        await audit(SR, { plan_id: plan.id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'plan_cancelled', reason: 'no_capacity_at_activation', is_demo: plan.is_demo });
        return json({ data: { id: plan.id, outcome: 'CANCEL', reason: 'no_capacity_at_activation' } });
      }

      // ensure Campaign exists
      let campaignId = plan.campaign_id || '';
      if (!campaignId) {
        const camp = await SR.entities.Campaign.create({
          restaurant_id: plan.restaurant_id, campaign_name: plan.plan_reason_ar || 'حملة TAMAM',
          objective: OBJECTIVE_TO_CAMPAIGN[plan.objective] || plan.objective || 'ACQUISITION', status: 'ACTIVE',
          start_at: plan.start_at, end_at: plan.end_at, primary_audience: plan.audience_segment ? [plan.audience_segment] : [],
          source_opportunity_id: plan.opportunity_id || '', linked_offer_ids: [], channels: ['home', 'mood_game', 'offers'],
          is_demo: plan.is_demo, demo_batch_id: plan.demo_batch_id || DEMO_BATCH_EXEC,
        });
        campaignId = camp.id;
      } else {
        await SR.entities.Campaign.update(campaignId, { status: 'ACTIVE' }).catch(() => null);
      }

      // create CampaignOffer (mirror createOffer + validateFunding)
      const offerPayload = buildOfferPayload(plan, dd, finalQuota);
      const v = validateFunding({ normal_price: offerPayload.normal_reference_price, customer_price: offerPayload.customer_price, restaurant_contribution: offerPayload.restaurant_contribution, tamam_contribution: offerPayload.tamam_contribution });
      if (!v.ok) {
        await SR.entities.CampaignPlan.update(plan.id, { status: 'APPROVAL_REQUIRED', kill_reason: 'invalid_funding' });
        await audit(SR, { plan_id: plan.id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'approval_requested', reason: 'invalid_funding', is_demo: plan.is_demo });
        return json({ data: { id: plan.id, outcome: 'NEEDS_REVIEW', reason: 'invalid_funding' } });
      }
      const offer = await SR.entities.CampaignOffer.create(offerPayload);
      await SR.entities.Campaign.update(campaignId, { linked_offer_ids: [offer.id] });

      await SR.entities.CampaignPlan.update(plan.id, {
        status: 'EXECUTED', campaign_id: campaignId, campaign_offer_id: offer.id, final_quota: finalQuota,
        monitor_state: 'HEALTHY', safety_gate_json: JSON.stringify(gate.checks),
      });
      await audit(SR, { plan_id: plan.id, campaign_id: campaignId, restaurant_id: plan.restaurant_id, actor: policy.automation_mode !== 'MANUAL' && policy.auto_activate_allowed ? 'automation' : (admin?.id || 'admin'), action: 'campaign_activated', old_state: plan.status, new_state: 'EXECUTED', is_demo: plan.is_demo });
      if (outcome === 'REDUCE_QUOTA') await audit(SR, { plan_id: plan.id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'quota_adjusted', reason: `${plan.planned_quota}->${finalQuota}`, is_demo: plan.is_demo });
      return json({ data: { id: plan.id, outcome, campaign_id: campaignId, campaign_offer_id: offer.id, final_quota: finalQuota, status: 'EXECUTED' } });
    }

    // ---------- REEVALUATE ACTIVE (CONTINUE/PAUSE/RESUME/COMPLETE) ----------
    if (action === 'reevaluateActive') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const plan = await SR.entities.CampaignPlan.get(payload.plan_id).catch(() => null);
      if (!plan) return json({ error: 'plan_not_found' }, 404);
      const dd = await SR.entities.DemandDecision.get(plan.demand_decision_id).catch(() => null);
      const rest = await SR.entities.Restaurant.get(plan.restaurant_id).catch(() => null);
      const sigs = await SR.entities.RestaurantOperationalSignal.filter({ restaurant_id: plan.restaurant_id, status: 'active' }).catch(() => []);
      const pressure = (sigs || []).some((s: any) => s.type === 'kitchen_pressure' || s.type === 'temporary_pause');
      const restaurantBusy = !!rest && (rest.current_status === 'busy' || rest.current_status === 'temporarily_unavailable');
      const restaurantOpen = !!(rest && rest.current_status === 'open' && rest.accepts_orders);
      const offer = plan.campaign_offer_id ? await SR.entities.CampaignOffer.get(plan.campaign_offer_id).catch(() => null) : null;
      const evMs = payload.test_time ? new Date(payload.test_time).getTime() : now();
      const winEnd = plan.end_at ? new Date(plan.end_at).getTime() : Infinity;

      // SOLD OUT / EXPIRED -> COMPLETE
      if (offer) {
        const st = offerStatus(offer, evMs);
        if (st === 'expired' || st === 'sold_out') {
          await SR.entities.CampaignPlan.update(plan.id, { status: 'COMPLETED', monitor_state: st === 'sold_out' ? 'SOLD_OUT' : 'EXPIRED' });
          if (plan.campaign_id) await SR.entities.Campaign.update(plan.campaign_id, { status: 'COMPLETED' }).catch(() => null);
          await audit(SR, { plan_id: plan.id, campaign_id: plan.campaign_id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'campaign_completed', reason: st, old_state: plan.status, new_state: 'COMPLETED', is_demo: plan.is_demo });
          return json({ data: { id: plan.id, recommendation: 'COMPLETE', reason: st, monitor_state: st === 'sold_out' ? 'SOLD_OUT' : 'EXPIRED' } });
        }
        // item sold_out -> pause/complete
        if (dd.restaurant_item_id) {
          const item = await SR.entities.RestaurantMealOffer.get(dd.restaurant_item_id).catch(() => null);
          if (item && (!item.active || !item.available || item.sold_out)) {
            await SR.entities.CampaignOffer.update(offer.id, { status: 'paused' }).catch(() => null);
            if (plan.campaign_id) await SR.entities.Campaign.update(plan.campaign_id, { status: 'PAUSED' }).catch(() => null);
            await SR.entities.CampaignPlan.update(plan.id, { status: 'PAUSED', monitor_state: 'SOLD_OUT', kill_reason: 'item_sold_out' });
            await audit(SR, { plan_id: plan.id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'campaign_paused', reason: 'item_sold_out', old_state: plan.status, new_state: 'PAUSED', is_demo: plan.is_demo });
            return json({ data: { id: plan.id, recommendation: 'PAUSE', reason: 'item_sold_out', monitor_state: 'SOLD_OUT' } });
          }
        }
      }

      // PRESSURE -> PAUSE (kill switch, section 16). Cap quota_total to quota_used so
      // UnifiedOffer resolves SOLD_OUT (not eligible) for new customers via the existing
      // bridge — paid orders already consumed are never affected. Restored on resume.
      if (pressure || restaurantBusy || !restaurantOpen) {
        const reason = pressure ? 'restaurant_pressure' : (!restaurantOpen ? 'restaurant_closed' : 'restaurant_busy');
        if (offer) await SR.entities.CampaignOffer.update(offer.id, { status: 'paused', quota_total: offer.quota_used || 0 }).catch(() => null);
        if (plan.campaign_id) await SR.entities.Campaign.update(plan.campaign_id, { status: 'PAUSED' }).catch(() => null);
        await SR.entities.CampaignPlan.update(plan.id, { status: 'PAUSED', monitor_state: 'PAUSED_OPERATIONAL', kill_reason: reason });
        await audit(SR, { plan_id: plan.id, campaign_id: plan.campaign_id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'campaign_paused', reason, old_state: plan.status, new_state: 'PAUSED', is_demo: plan.is_demo });
        return json({ data: { id: plan.id, recommendation: 'PAUSE', reason, monitor_state: 'PAUSED_OPERATIONAL', message_ar: 'المطعم عليه ضغط — تم إيقاف الحملة. الطلبات المدفوعة ما تتأثر.' } });
      }

      // PAUSED + pressure cleared -> RESUME / COMPLETE / KEEP_PAUSED
      if (plan.status === 'PAUSED') {
        const timeRemains = evMs < winEnd;
        const remaining = offer && offer.quota_total != null ? Math.max(0, offer.quota_total - (offer.quota_used || 0)) : null;
        const valuePositive = (remaining == null || remaining > 0) && timeRemains && (offer?.customer_price || 0) > 0;
        if (!timeRemains) {
          await SR.entities.CampaignPlan.update(plan.id, { status: 'COMPLETED', monitor_state: 'EXPIRED' });
          if (plan.campaign_id) await SR.entities.Campaign.update(plan.campaign_id, { status: 'COMPLETED' }).catch(() => null);
          await audit(SR, { plan_id: plan.id, action: 'campaign_completed', reason: 'expired_after_pause', is_demo: plan.is_demo });
          return json({ data: { id: plan.id, recommendation: 'COMPLETE', reason: 'expired_after_pause' } });
        }
        if (valuePositive) {
          if (offer) await SR.entities.CampaignOffer.update(offer.id, { status: 'active', quota_total: plan.final_quota || offer.quota_total || 0 }).catch(() => null);
          if (plan.campaign_id) await SR.entities.Campaign.update(plan.campaign_id, { status: 'ACTIVE' }).catch(() => null);
          await SR.entities.CampaignPlan.update(plan.id, { status: 'EXECUTED', monitor_state: 'HEALTHY', kill_reason: '' });
          await audit(SR, { plan_id: plan.id, action: 'campaign_resumed', reason: 'pressure_cleared', is_demo: plan.is_demo });
          return json({ data: { id: plan.id, recommendation: 'RESUME', reason: 'pressure_cleared', monitor_state: 'HEALTHY', message_ar: 'الضغط انفرج — بنوصي باستئناف الحملة.' } });
        }
        return json({ data: { id: plan.id, recommendation: 'KEEP_PAUSED', reason: 'no_remaining_value' } });
      }

      // ACTIVE + healthy -> CONTINUE / monitor underperforming
      await SR.entities.CampaignPlan.update(plan.id, { monitor_state: 'HEALTHY' });
      return json({ data: { id: plan.id, recommendation: 'CONTINUE', reason: 'healthy', monitor_state: 'HEALTHY' } });
    }

    // ---------- COMPLETE CAMPAIGN -> CampaignLearning ----------
    if (action === 'completeCampaign') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const plan = await SR.entities.CampaignPlan.get(payload.plan_id).catch(() => null);
      if (!plan) return json({ error: 'plan_not_found' }, 404);
      const dd = await SR.entities.DemandDecision.get(plan.demand_decision_id).catch(() => null);
      const events = plan.campaign_id ? await SR.entities.CampaignEvent.filter({ campaign_id: plan.campaign_id }).catch(() => []) : [];
      const purchases = (events || []).filter((e: any) => e.event_type === 'purchase');
      const impressions = (events || []).filter((e: any) => e.event_type === 'impression').length;
      const actualOrders = purchases.length;
      const baseline = dd?.baseline_orders || 0;
      const estimatedIncremental = Math.max(0, actualOrders - baseline);
      const revenue = round2(purchases.reduce((s: number, e: any) => s + (e.amount || 0), 0));
      const restaurantSettlement = round2(purchases.reduce((s: number, e: any) => s + (e.restaurant_settlement || 0), 0));
      const tamamContribution = round2((plan.tamam_contribution || 0) * actualOrders);
      const tamamRetained = round2(purchases.reduce((s: number, e: any) => s + (e.tamam_revenue || 0), 0));
      const incidents: string[] = [];
      if (plan.monitor_state === 'PAUSED_OPERATIONAL') incidents.push('pressure_pause');
      if (plan.monitor_state === 'SOLD_OUT') incidents.push('sold_out');
      // overlap check (confounded)
      const overlapping = await countActiveCampaigns(SR, plan.restaurant_id, new Date(plan.start_at || Date.now()).getTime(), plan.campaign_id || '');
      const conversion = impressions > 0 ? round2(actualOrders / impressions) : null;

      // result_status (section 29 learning safety)
      let resultStatus = 'STRONG';
      let confidence = 0.7;
      if (incidents.length > 0) { resultStatus = 'INTERRUPTED'; confidence = 0.3; }
      else if (actualOrders < LEARNING.min_sample_size) { resultStatus = 'INSUFFICIENT_DATA'; confidence = 0.2; }
      else if (overlapping > 0) { resultStatus = 'CONFOUNDED'; confidence = 0.35; }
      else if (estimatedIncremental >= LEARNING.strong_min_incremental) { resultStatus = 'STRONG'; confidence = 0.75; }
      else if (estimatedIncremental >= LEARNING.moderate_min_incremental) { resultStatus = 'MODERATE'; confidence = 0.6; }
      else { resultStatus = 'WEAK'; confidence = 0.5; }

      const summary = `الخط الأساسي ${baseline} طلب، الفعلي ${actualOrders}، التقديري الإضافي ~${estimatedIncremental}. الحالة: ${resultStatus}.`;
      const learning = await SR.entities.CampaignLearning.create({
        campaign_id: plan.campaign_id || '', demand_decision_id: plan.demand_decision_id, campaign_plan_id: plan.id,
        restaurant_id: plan.restaurant_id,
        product_context_json: JSON.stringify({ tamam_product_id: dd?.tamam_product_id || null, restaurant_item_id: dd?.restaurant_item_id || null, variant: plan.variant }),
        time_context_json: JSON.stringify({ start_at: plan.start_at, end_at: plan.end_at }),
        objective: plan.objective, audience_segment: plan.audience_segment, mechanism: plan.mechanism, explore_exploit: plan.explore_exploit || 'EXPLOIT',
        baseline_orders: baseline, expected_incremental_orders: dd?.expected_incremental_orders || 0,
        actual_orders: actualOrders, estimated_incremental_orders: estimatedIncremental,
        revenue, restaurant_settlement: restaurantSettlement, tamam_contribution: tamamContribution, tamam_retained_revenue: tamamRetained,
        operational_incidents: incidents, conversion,
        result_status: resultStatus, sample_size: actualOrders, confidence, learning_summary: summary,
        is_demo: plan.is_demo, demo_batch_id: plan.demo_batch_id || DEMO_BATCH_EXEC,
      });
      await SR.entities.CampaignPlan.update(plan.id, { status: 'COMPLETED', monitor_state: 'COMPLETED' === plan.status ? plan.monitor_state : 'HEALTHY' });
      if (plan.campaign_id) await SR.entities.Campaign.update(plan.campaign_id, { status: 'COMPLETED' }).catch(() => null);
      await audit(SR, { plan_id: plan.id, campaign_id: plan.campaign_id, restaurant_id: plan.restaurant_id, actor: 'system', action: 'campaign_completed', reason: resultStatus, old_state: plan.status, new_state: 'COMPLETED', is_demo: plan.is_demo });
      return json({ data: { id: plan.id, learning_id: learning.id, result_status: resultStatus, confidence, estimated_incremental: estimatedIncremental } });
    }

    // ---------- MANUAL OVERRIDE ----------
    if (action === 'manualOverride') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const plan = await SR.entities.CampaignPlan.get(payload.plan_id).catch(() => null);
      if (!plan) return json({ error: 'plan_not_found' }, 404);
      const act = payload.action; // pause | resume | cancel | reduce_quota | reject | force_review
      const oldStatus = plan.status;
      if (act === 'cancel') {
        await SR.entities.CampaignPlan.update(plan.id, { status: 'CANCELLED' });
        if (plan.campaign_id) await SR.entities.Campaign.update(plan.campaign_id, { status: 'CANCELLED' }).catch(() => null);
        if (plan.campaign_offer_id) await SR.entities.CampaignOffer.update(plan.campaign_offer_id, { status: 'paused' }).catch(() => null);
      } else if (act === 'pause') {
        const off = plan.campaign_offer_id ? await SR.entities.CampaignOffer.get(plan.campaign_offer_id).catch(() => null) : null;
        await SR.entities.CampaignPlan.update(plan.id, { status: 'PAUSED', monitor_state: 'PAUSED_OPERATIONAL' });
        if (plan.campaign_id) await SR.entities.Campaign.update(plan.campaign_id, { status: 'PAUSED' }).catch(() => null);
        if (off) await SR.entities.CampaignOffer.update(plan.campaign_offer_id, { status: 'paused', quota_total: off.quota_used || 0 }).catch(() => null);
      } else if (act === 'resume') {
        await SR.entities.CampaignPlan.update(plan.id, { status: 'EXECUTED', monitor_state: 'HEALTHY' });
        if (plan.campaign_id) await SR.entities.Campaign.update(plan.campaign_id, { status: 'ACTIVE' }).catch(() => null);
        if (plan.campaign_offer_id) await SR.entities.CampaignOffer.update(plan.campaign_offer_id, { status: 'active', quota_total: plan.final_quota || 0 }).catch(() => null);
      } else if (act === 'reduce_quota') {
        const newQuota = Math.max(1, Math.floor(Number(payload.quota) || plan.final_quota - 1));
        await SR.entities.CampaignPlan.update(plan.id, { final_quota: newQuota });
        if (plan.campaign_offer_id) await SR.entities.CampaignOffer.update(plan.campaign_offer_id, { quota_total: newQuota }).catch(() => null);
      } else if (act === 'reject') {
        await SR.entities.CampaignPlan.update(plan.id, { status: 'REJECTED', kill_reason: 'manual_reject' });
      } else if (act === 'force_review') {
        await SR.entities.CampaignPlan.update(plan.id, { status: 'APPROVAL_REQUIRED', kill_reason: 'forced_review' });
      }
      await audit(SR, { plan_id: plan.id, campaign_id: plan.campaign_id, restaurant_id: plan.restaurant_id, actor: admin?.id || 'admin', action: 'manual_override', reason: act, old_state: oldStatus, new_state: act, is_demo: plan.is_demo });
      return json({ data: { id: plan.id, action: act, ok: true } });
    }

    // ---------- GET / LIST ----------
    if (action === 'getPlan' || action === 'getPlanDetail') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const plan = await SR.entities.CampaignPlan.get(payload.plan_id).catch(() => null);
      if (!plan) return json({ error: 'not_found' }, 404);
      const dd = plan.demand_decision_id ? await SR.entities.DemandDecision.get(plan.demand_decision_id).catch(() => null) : null;
      const opp = plan.opportunity_id ? await SR.entities.Opportunity.get(plan.opportunity_id).catch(() => null) : null;
      const camp = plan.campaign_id ? await SR.entities.Campaign.get(plan.campaign_id).catch(() => null) : null;
      const offer = plan.campaign_offer_id ? await SR.entities.CampaignOffer.get(plan.campaign_offer_id).catch(() => null) : null;
      const auditLogs = await SR.entities.ExecutionAuditLog.filter({ plan_id: plan.id }).catch(() => []);
      const gate = plan.safety_gate_json ? JSON.parse(plan.safety_gate_json) : null;
      return json({ data: { plan, demand_decision: dd, opportunity: opp, campaign: camp, offer, audit: auditLogs || [], safety_gate: gate } });
    }
    if (action === 'listPlans') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      let list = payload.status
        ? await SR.entities.CampaignPlan.filter({ status: payload.status }, '-created_date', 200).catch(() => [])
        : await SR.entities.CampaignPlan.list('-created_date', 200).catch(() => []);
      list = list || [];
      return json({ data: list });
    }
    if (action === 'listExecutionAudit') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const list = payload.plan_id
        ? await SR.entities.ExecutionAuditLog.filter({ plan_id: payload.plan_id }, '-created_date', 100).catch(() => [])
        : await SR.entities.ExecutionAuditLog.list('-created_date', 100).catch(() => []);
      return json({ data: list || [] });
    }

    // ---------- EXECUTION CENTER ----------
    if (action === 'getExecutionCenter') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const plans = await SR.entities.CampaignPlan.list('-created_date', 200).catch(() => []);
      const control = await getControl(SR);
      const groups: Record<string, any[]> = { READY: [], SCHEDULED: [], EXECUTED: [], PAUSED: [], APPROVAL_REQUIRED: [], COMPLETED: [] };
      for (const p of (plans || [])) {
        const s = p.status;
        if (groups[s]) groups[s].push(p);
      }
      return json({ data: { groups, automation_control: control, counts: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])) } });
    }

    // ---------- RUN EXECUTION TESTS (A–L) ----------
    if (action === 'runExecutionTests') {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      const results: any[] = [];
      const rest = await getDemoRestaurant(SR);
      if (!rest) return json({ error: 'demo_restaurant_missing' }, 400);
      const meals = await SR.entities.RestaurantMealOffer.filter({ restaurant_id: rest.id, is_demo: true }).catch(() => []);
      const sh = (meals || []).find((m: any) => { const n = ((m.restaurant_product_name || m.meal_name_snapshot || '') + ' ' + (m.short_description_ar || '')).toLowerCase(); return n.includes('شاورما') || n.includes('shawarma'); }) || (meals || [])[0] || null;

      const t = (id: string, status: boolean, message: string, details?: any) => results.push({ test_id: id, status: status ? 'PASS' : 'FAIL', message, details: details || undefined });

      // helper: make a DemandDecision via demandDecisionEngine.evaluate
      const makeDD = async (scenarioKey: string, testTime?: string) => {
        const r = await base44.functions.invoke('demandDecisionEngine', { action: 'evaluate', payload: { scenario_key: scenarioKey, test_time: testTime } }).then((x: any) => x?.data?.data ?? x?.data ?? x);
        return r;
      };
      const makeCustomDD = async (inputs: any) => {
        const r = await base44.functions.invoke('demandDecisionEngine', { action: 'evaluate', payload: { custom_inputs: { ...inputs, restaurant_id: rest.id, restaurant_item_id: sh?.id || '' } } }).then((x: any) => x?.data?.data ?? x?.data ?? x);
        return r;
      };
      const genPlan = async (ddId: string, testTime?: string) =>
        base44.functions.invoke('demandExecutionEngine', { action: 'generatePlan', payload: { demand_decision_id: ddId, test_time: testTime } }).then((x: any) => x?.data?.data ?? x?.data ?? x);

      // reset exec-batch artifacts from prior runs (keep internal plans/learning/audit/decisions for inspection; clean customer-facing)
      await SR.entities.CampaignOffer.deleteMany({ demo_batch_id: DEMO_BATCH_EXEC }).catch(() => null);
      await SR.entities.Campaign.deleteMany({ demo_batch_id: DEMO_BATCH_EXEC }).catch(() => null);
      await SR.entities.RestaurantOperationalSignal.deleteMany({ restaurant_id: rest.id, type: 'kitchen_pressure' }).catch(() => null);

      // A. NO_ACTION creates nothing
      try {
        const dd = await makeDD('B_busy_period');
        const plan = await genPlan(dd.id);
        t('A_no_action_creates_nothing', plan.status === 'REJECTED' && !plan.opportunity_id && !plan.campaign_id, `decision=${dd.decision} plan=${plan.status} (no opportunity/campaign/offer)`, { plan_status: plan.status });
      } catch (e: any) { t('A_no_action_creates_nothing', false, e.message); }

      // B. MANUAL PREPARE creates plan but does not activate
      try {
        await base44.functions.invoke('demandExecutionEngine', { action: 'updatePolicy', payload: { restaurant_id: rest.id, changes: { ...POLICY_DEFAULTS } } });
        const dd = await makeDD('A_weak_period');
        const plan = await genPlan(dd.id);
        const noOffer = !plan.campaign_offer_id;
        t('B_manual_prepare_no_activate', plan.status === 'READY' && plan.execution_mode === 'MANUAL' && noOffer, `plan=${plan.status} mode=${plan.execution_mode} offer=${plan.campaign_offer_id || 'none'}`, { plan_status: plan.status });
      } catch (e: any) { t('B_manual_prepare_no_activate', false, e.message); }

      // C. GUARDED safe ACT_NOW can execute
      let cPlanId = '', cOfferId = '';
      try {
        await base44.functions.invoke('demandExecutionEngine', { action: 'setGuardedDemoPolicy', payload: { restaurant_id: rest.id } });
        const dd = await makeDD('D_surplus');
        const winStart = new Date(dd.window_start).getTime();
        const inWindow = new Date(winStart + 30 * 60000).toISOString();
        const plan = await genPlan(dd.id, inWindow);
        const scheduled = await base44.functions.invoke('demandExecutionEngine', { action: 'schedulePlan', payload: { plan_id: plan.id, test_time: inWindow } }).then((x: any) => x?.data?.data ?? x?.data ?? x);
        const activated = await base44.functions.invoke('demandExecutionEngine', { action: 'activatePlan', payload: { plan_id: plan.id, test_time: inWindow } }).then((x: any) => x?.data?.data ?? x?.data ?? x);
        cPlanId = plan.id; cOfferId = activated.campaign_offer_id || '';
        t('C_guarded_act_now_executes', activated.outcome === 'ACTIVATE' && activated.status === 'EXECUTED' && !!cOfferId, `outcome=${activated.outcome} offer=${cOfferId || 'none'}`, { outcome: activated.outcome, offer_id: cOfferId });
      } catch (e: any) { t('C_guarded_act_now_executes', false, e.message); }

      // D. pressure blocks activation
      try {
        const dd = await makeDD('D_surplus');
        const winStart = new Date(dd.window_start).getTime();
        const inWindow = new Date(winStart + 30 * 60000).toISOString();
        const plan = await genPlan(dd.id, inWindow);
        await SR.entities.RestaurantOperationalSignal.create({ restaurant_id: rest.id, type: 'kitchen_pressure', status: 'active', reason: 'test', starts_at: inWindow, expires_at: new Date(winStart + 120 * 60000).toISOString() });
        const activated = await base44.functions.invoke('demandExecutionEngine', { action: 'activatePlan', payload: { plan_id: plan.id, test_time: inWindow } }).then((x: any) => x?.data?.data ?? x?.data ?? x);
        const blocked = activated.outcome === 'CANCEL' || activated.outcome === 'DELAY' || activated.outcome === 'NEEDS_REVIEW';
        await SR.entities.RestaurantOperationalSignal.deleteMany({ restaurant_id: rest.id, type: 'kitchen_pressure' }).catch(() => null);
        t('D_pressure_blocks_activation', blocked && !activated.campaign_offer_id, `outcome=${activated.outcome} offer=${activated.campaign_offer_id || 'none'}`, { outcome: activated.outcome });
      } catch (e: any) { t('D_pressure_blocks_activation', false, e.message); }

      // E. active campaign pressure causes pause
      try {
        if (cPlanId) {
          const plan = await SR.entities.CampaignPlan.get(cPlanId).catch(() => null);
          const winStart = plan ? new Date(plan.start_at).getTime() : Date.now();
          const inWindow = new Date(winStart + 45 * 60000).toISOString();
          await SR.entities.RestaurantOperationalSignal.create({ restaurant_id: rest.id, type: 'kitchen_pressure', status: 'active', reason: 'test', starts_at: inWindow, expires_at: new Date(winStart + 120 * 60000).toISOString() });
          const r = await base44.functions.invoke('demandExecutionEngine', { action: 'reevaluateActive', payload: { plan_id: cPlanId, test_time: inWindow } }).then((x: any) => x?.data?.data ?? x?.data ?? x);
          await SR.entities.RestaurantOperationalSignal.deleteMany({ restaurant_id: rest.id, type: 'kitchen_pressure' }).catch(() => null);
          // verify UnifiedOffer no longer eligible for new customers
          const u = cOfferId ? await base44.functions.invoke('campaignEngine', { action: 'unifiedGet', payload: { source_type: 'CAMPAIGN', id: cOfferId, phone: '0500000000', include_demo: true, test_time: inWindow } }).then((x: any) => x?.data?.data ?? x?.data ?? x) : null;
          const notEligible = !u || !u.eligible;
          t('E_active_pressure_pauses', r.recommendation === 'PAUSE' && notEligible, `rec=${r.recommendation} unified_eligible=${u?.eligible} state=${u?.card_state}`, { recommendation: r.recommendation, card_state: u?.card_state });
        } else t('E_active_pressure_pauses', false, 'no C plan');
      } catch (e: any) { t('E_active_pressure_pauses', false, e.message); }

      // F. commercial violation requires approval (scenario I is commercial_unsafe + demo-isolated)
      try {
        const dd = await makeDD('I_commercial_unsafe');
        const plan = await genPlan(dd.id);
        t('F_commercial_violation_approval', plan.status === 'APPROVAL_REQUIRED', `plan=${plan.status} kill=${plan.kill_reason || ''}`, { plan_status: plan.status });
      } catch (e: any) { t('F_commercial_violation_approval', false, e.message); }

      // G. EXPLORE quota obeys test cap
      try {
        await base44.functions.invoke('demandExecutionEngine', { action: 'updatePolicy', payload: { restaurant_id: rest.id, changes: { learning_mode_order_cap: 5 } } });
        const dd = await makeDD('H_low_confidence_new_restaurant');
        const plan = await genPlan(dd.id);
        await base44.functions.invoke('demandExecutionEngine', { action: 'setGuardedDemoPolicy', payload: { restaurant_id: rest.id } });
        t('G_explore_quota_cap', plan.planned_quota <= 5, `planned_quota=${plan.planned_quota} (gap=${dd.demand_gap}, cap=5)`, { planned_quota: plan.planned_quota });
      } catch (e: any) { t('G_explore_quota_cap', false, e.message); }

      // H. duplicate execution is idempotent (same decision -> same plan)
      try {
        const dd = await makeDD('F_high_intent_new_customer');
        const p1 = await genPlan(dd.id);
        const p2 = await genPlan(dd.id);
        t('H_duplicate_idempotent', p1.id === p2.id && p2.idempotent === true, `p1=${p1.id?.slice(-6)} p2=${p2.id?.slice(-6)} idempotent=${p2.idempotent}`, { same: p1.id === p2.id });
      } catch (e: any) { t('H_duplicate_idempotent', false, e.message); }

      // I. CampaignOffer reaches UnifiedOffer (bridge resolves the execution-engine offer)
      try {
        const u = cOfferId ? await base44.functions.invoke('campaignEngine', { action: 'unifiedGet', payload: { source_type: 'CAMPAIGN', id: cOfferId, phone: '0500000000', include_demo: true, test_time: payload.test_time } }).then((x: any) => x?.data?.data ?? x?.data ?? x) : null;
        t('I_offer_reaches_unified', !!u && u.source_type === 'CAMPAIGN' && u.customer_price != null && ['ACTIVE', 'UNLOCKED', 'UPCOMING', 'SOLD_OUT', 'EXPIRED', 'LOCKED_POINTS'].includes(u.card_state), `card_state=${u?.card_state} price=${u?.customer_price}`, { card_state: u?.card_state, price: u?.customer_price });
      } catch (e: any) { t('I_offer_reaches_unified', false, e.message); }

      // K. completed campaign creates learning record
      try {
        if (cPlanId) {
          // simulate a purchase event for the campaign
          if (cOfferId) await SR.entities.CampaignEvent.create({ campaign_id: (await SR.entities.CampaignPlan.get(cPlanId)).campaign_id || '', offer_id: cOfferId, restaurant_id: rest.id, phone: '0500000000', channel: 'home', event_type: 'purchase', amount: 51, restaurant_settlement: 40, tamam_revenue: 11, is_demo: true, demo_batch_id: DEMO_BATCH_EXEC }).catch(() => null);
          const comp = await base44.functions.invoke('demandExecutionEngine', { action: 'completeCampaign', payload: { plan_id: cPlanId } }).then((x: any) => x?.data?.data ?? x?.data ?? x);
          const learn = comp?.learning_id ? await SR.entities.CampaignLearning.get(comp.learning_id).catch(() => null) : null;
          t('K_completed_creates_learning', !!learn && ['STRONG', 'MODERATE', 'WEAK', 'INSUFFICIENT_DATA', 'CONFOUNDED', 'INTERRUPTED'].includes(learn.result_status), `learning=${comp?.learning_id?.slice(-6) || 'none'} status=${learn?.result_status}`, { result_status: learn?.result_status });
        } else t('K_completed_creates_learning', false, 'no C plan');
      } catch (e: any) { t('K_completed_creates_learning', false, e.message); }

      // L. insufficient sample does not create false strong learning
      try {
        // a plan with zero purchases
        const dd = await makeDD('F_high_intent_new_customer');
        const plan = await genPlan(dd.id);
        await base44.functions.invoke('demandExecutionEngine', { action: 'schedulePlan', payload: { plan_id: plan.id } }).then((x: any) => x?.data?.data ?? x);
        await base44.functions.invoke('demandExecutionEngine', { action: 'activatePlan', payload: { plan_id: plan.id } }).then((x: any) => x?.data?.data ?? x);
        const comp = await base44.functions.invoke('demandExecutionEngine', { action: 'completeCampaign', payload: { plan_id: plan.id } }).then((x: any) => x?.data?.data ?? x?.data ?? x);
        const learn = comp?.learning_id ? await SR.entities.CampaignLearning.get(comp.learning_id).catch(() => null) : null;
        t('L_insufficient_sample_no_false_strong', !!learn && learn.result_status === 'INSUFFICIENT_DATA', `result_status=${learn?.result_status} (actual_orders=${learn?.actual_orders})`, { result_status: learn?.result_status, actual_orders: learn?.actual_orders });
      } catch (e: any) { t('L_insufficient_sample_no_false_strong', false, e.message); }

      // cleanup customer-facing artifacts (keep internal plans/learning/audit/decisions)
      await SR.entities.CampaignOffer.deleteMany({ demo_batch_id: DEMO_BATCH_EXEC }).catch(() => null);
      await SR.entities.Campaign.deleteMany({ demo_batch_id: DEMO_BATCH_EXEC }).catch(() => null);
      await SR.entities.RestaurantOperationalSignal.deleteMany({ restaurant_id: rest.id, type: 'kitchen_pressure' }).catch(() => null);
      // restore guarded policy for demo browsing
      await base44.functions.invoke('demandExecutionEngine', { action: 'setGuardedDemoPolicy', payload: { restaurant_id: rest.id } }).then((x: any) => x?.data).catch(() => null);

      const passed = results.filter((r) => r.status === 'PASS').length;
      return json({ data: { tests: results, passed, total: results.length, overall: passed === results.length ? 'MILESTONE_3_PASS' : 'MILESTONE_3_FAIL' } });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error('demandExecutionEngine error', e);
    return json({ error: e.message || 'server_error' }, 500);
  }
}