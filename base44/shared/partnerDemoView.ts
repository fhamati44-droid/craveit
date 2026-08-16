// ============================================================================
// partnerDemoView — partner-readable view layer over the existing TAMAM
// demand intelligence (Campaign / CampaignOffer / DemandDecision / Opportunity
// / DemandDayProfile / Restaurant capacity). This is READ-ONLY visibility:
// it never mutates engine state, only translates internal records into the
// Arabic, owner-friendly language the sales demo needs. No scores, no IDs,
// no internal enums reach the partner UI.
// ============================================================================

import {
  AUDIENCE_LABEL_AR, commercialBreakdown, trafficLightFromDemand, TRAFFIC_LIGHT_AR,
} from './campaignCommerce.ts';

export const DEMO_RESTAURANT_BATCH = 'tamam-demo-partner-v1';

// ---- Partner-friendly labels (no internal enum names) ----
export const OFFER_TYPE_AR: Record<string, string> = {
  STANDARD_VALUE: 'عرض قيمة',
  DIRECT_PRICE: 'خصم مباشر',
  VALUE_ADD: 'قيمة مضافة',
  FIRST_TRIAL: 'تجربة أولى',
  REACTIVATION: 'إعادة زبون',
  LIMITED_TIME: 'عرض محدود الوقت',
  LIMITED_QUANTITY: 'كمية محدودة',
  TIME_AND_QUANTITY: 'عرض وقت وكمية',
  POINT_LOCKED: 'عرض حصري بالنقاط',
  COUPON_LOCKED: 'عرض بكوبون',
  LOYALTY: 'عرض ولاء',
  AOV_UPSELL: 'ترقية السلة',
  SURPLUS: 'فائض الكمية',
  RAW_MATERIAL_OPPORTUNITY: 'فرصة المادة الخام',
  COMMUNITY: 'عرض مجتمعي',
  CROSS_RESTAURANT: 'عرض بين مطاعم',
};

export const OBJECTIVE_AR: Record<string, string> = {
  NEW_CUSTOMERS: 'زباين جدد',
  REACTIVATION: 'إرجاع الزباين',
  IMMEDIATE_DEMAND: 'طلب فوري',
  INCREASE_AOV: 'رفع متوسط السلة',
  LOYALTY_ENGAGEMENT: 'تفعيل الولاء',
  CONVERSION_RECOVERY: 'تحويل النية لطلب',
  SURPLUS: 'تصريف فائض',
  STRENGTHEN_ITEM: 'تقوية وجبة',
  TEST_RESTAURANT: 'تجربة المطعم',
  REPEAT_PURCHASE: 'تكرار الطلب',
  PAYDAY_AOV: 'يوم الراتب',
  ACQUISITION: 'جلب زباين',
};

export const MECHANISM_AR: Record<string, string> = {
  NO_DISCOUNT: 'بدون خصم',
  VALUE_ADD: 'قيمة مضافة',
  MIX_VALUE: 'ميكس قيمة',
  POINT_LOCKED: 'نقاط',
  LIMITED_QUANTITY: 'كمية محدودة',
  FIRST_TRIAL: 'تجربة أولى',
  TIME_AND_QUANTITY: 'وقت وكمية',
  PERSONALIZED_VALUE: 'عرض شخصي',
  PLUS_UPSELL: 'ترقية بلس',
  DIRECT_PRICE: 'خصم مباشر',
};

// Traffic-light colors for the owner (GREEN = TAMAM can push, RED = don't push)
export const TRAFFIC_DOT: Record<string, string> = {
  GREEN: '🟢', YELLOW: '🟡', RED: '🔴',
};
export const TRAFFIC_LABEL_AR: Record<string, string> = {
  GREEN: 'TAMAM تقدر تقوّي',
  YELLOW: 'نشتغل بحذر',
  RED: 'ما نجيب طلبات زيادة',
};
export const DEMAND_LEVEL_AR: Record<string, string> = {
  quiet: 'هادئ', medium: 'متوسط', busy: 'ضغط', unknown: 'مش محدد',
};

export const DAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// ---- Helpers ----
function round2(n: number): number { return Math.round(n * 100) / 100; }

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}
export function fmtRange(startIso?: string, endIso?: string): string {
  const s = fmtTime(startIso), e = fmtTime(endIso);
  if (s && e) return `${s} ← ${e}`;
  return s || e || '';
}
export function fmtDayTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${DAY_AR[d.getDay()]} ${d.toLocaleString('ar', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return ''; }
}

// Determine live offer status from time + quota (mirrors campaignEngine.offerStatus)
export function liveOfferStatus(o: any, nowMs: number): string {
  const start = o.start_at ? new Date(o.start_at).getTime() : 0;
  const end = o.end_at ? new Date(o.end_at).getTime() : Infinity;
  if (o.status === 'paused') return 'paused';
  if (o.status === 'completed') return 'completed';
  if (nowMs < start) return 'scheduled';
  if (nowMs >= end) return 'ended';
  const total = o.quota_total == null ? null : o.quota_total;
  if (total != null && (o.quota_used || 0) >= total) return 'sold_out';
  return 'active';
}

export function remainingMs(endIso: string, nowMs: number): number {
  const end = new Date(endIso).getTime();
  return isFinite(end) ? Math.max(0, end - nowMs) : 0;
}
export function fmtRemaining(ms: number): string {
  if (ms <= 0) return 'انتهى';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs} ساعة ${rem} دقيقة` : `${hrs} ساعة`;
}

// ---- Clean title for an offer (campaign-engine seeds have clean titles;
// decision-engine seeds have auto-generated ones — derive a clean one) ----
export function cleanOfferTitle(o: any): string {
  const t = (o.offer_title || '').trim();
  // If the title is a clean short one (not starting with "الهدف:"), keep it
  if (t && !t.startsWith('الهدف:') && !t.startsWith('الجمهور:')) return t;
  const typeLabel = OFFER_TYPE_AR[o.offer_type] || 'عرض';
  const variant = o.mealset_variant_id === 'plus' ? 'بلس' : o.mealset_variant_id === 'mix' ? 'ميكس' : '';
  return [typeLabel, variant].filter(Boolean).join(' — ');
}

// ---- Partner-readable offer summary ----
export function offerToPartner(o: any, campaign: any | null, nowMs: number) {
  const status = liveOfferStatus(o, nowMs);
  const total = o.quota_total == null ? null : o.quota_total;
  const used = o.quota_used || 0;
  const remaining = total == null ? null : Math.max(0, total - used);
  const bd = commercialBreakdown({
    normal_price: o.normal_reference_price, customer_price: o.customer_price,
    restaurant_contribution: o.restaurant_contribution, tamam_contribution: o.tamam_contribution,
  });
  const why = campaign?.why_tamam_json ? safeParse(campaign.why_tamam_json) : null;
  return {
    id: o.id,
    campaign_id: o.campaign_id,
    title: cleanOfferTitle(o),
    type: o.offer_type,
    type_label: OFFER_TYPE_AR[o.offer_type] || o.offer_type,
    variant: o.mealset_variant_id,
    objective: campaign?.objective || '',
    objective_label: OBJECTIVE_AR[campaign?.objective] || '',
    audience: (o.audience_rule || []).map((a: string) => AUDIENCE_LABEL_AR[a] || a),
    customer_price: o.customer_price,
    normal_price: o.normal_reference_price,
    value_add: o.value_add_description || '',
    unlock_type: o.unlock_type || 'none',
    unlock_points: o.unlock_points || 0,
    start_at: o.start_at, end_at: o.end_at,
    quota_total: total, quota_used: used, quota_remaining: remaining,
    status,
    remaining_time_ms: o.end_at ? remainingMs(o.end_at, nowMs) : 0,
    commercial: {
      normal: bd.normal, customer: bd.customer,
      tamam_contribution: round2(bd.tamam_contribution),
      restaurant_contribution: round2(bd.restaurant_contribution),
      restaurant_settlement: round2(bd.restaurant_settlement),
    },
    within_guardrails: true,
    why,
    restaurant_item_id: o.restaurant_item_id,
  };
}

function safeParse(s: any) {
  try { return typeof s === 'string' ? JSON.parse(s) : (s || null); } catch { return null; }
}

// ============================================================================
// READ-ONLY aggregations for the partner demo dashboard
// ============================================================================

// Returns the active live signal state (pressure / surplus / sold_out / raw_material)
export async function readLiveSignals(SR: any, rid: string) {
  const signals = await SR.entities.RestaurantOperationalSignal
    .filter({ restaurant_id: rid, status: 'active' }, '-created_date', 20).catch(() => []);
  const active = (signals || []);
  const hasPressure = active.some((s: any) => s.type === 'pressure');
  const hasSurplus = active.some((s: any) => s.type === 'surplus');
  const hasRawMaterial = active.some((s: any) => s.type === 'raw_material');
  return { active: active.map((s: any) => ({
    id: s.id, type: s.type, reason: s.reason || '',
    quantity: s.quantity, created_at: s.starts_at,
  })), hasPressure, hasSurplus, hasRawMaterial };
}

// "الوضع إسا" — derives the owner-visible live status from restaurant + signals
export function deriveLiveStatus(restaurant: any, signals: any) {
  if (signals.hasPressure || restaurant.current_status === 'busy')
    return { key: 'pressure', dot: '🔴', label: 'ضغط', desc: 'مطبخك تحت الضغط — TAMAM وقفت جلب طلبات جديدة مؤقتاً', tone: 'red' };
  if (restaurant.current_status === 'temporarily_unavailable' || !restaurant.accepts_orders)
    return { key: 'closed', dot: '⚫', label: 'مغلق', desc: 'المطعم ما يستقبل طلبات هسا', tone: 'gray' };
  return { key: 'ready', dot: '🟢', label: 'جاهزين', desc: 'جاهزين لاستقبال طلبات زيادة', tone: 'green' };
}

// "TAMAM شغالة إسا" — active offers (live by time)
export async function readActiveCampaigns(SR: any, rid: string, nowMs: number) {
  const offers = await SR.entities.CampaignOffer
    .filter({ restaurant_id: rid }, '-created_date', 100).catch(() => []);
  const active = (offers || []).filter((o: any) => liveOfferStatus(o, nowMs) === 'active');
  const paused = (offers || []).filter((o: any) => liveOfferStatus(o, nowMs) === 'paused');
  const campIds = [...new Set(active.map((o: any) => o.campaign_id).filter(Boolean))];
  const camps = campIds.length ? await SR.entities.Campaign.filter({ id: { $in: campIds } }).catch(() => []) : [];
  const campMap: any = {};
  for (const c of (camps || [])) campMap[c.id] = c;
  return {
    active: active.map((o: any) => offerToPartner(o, campMap[o.campaign_id] || null, nowMs)),
    paused: paused.map((o: any) => offerToPartner(o, campMap[o.campaign_id] || null, nowMs)),
  };
}

// "TAMAM لقت فرصة" — latest non-blocked DemandDecision with partner explanation
export async function readLatestOpportunity(SR: any, rid: string) {
  const decisions = await SR.entities.DemandDecision
    .filter({ restaurant_id: rid, is_demo: true }, '-created_date', 20).catch(() => []);
  const actionable = (decisions || []).find((d: any) =>
    ['ACT_NOW', 'SCHEDULE', 'PREPARE'].includes(d.decision) && d.explanation_partner);
  if (!actionable) return null;
  const why = buildWhyChain(actionable);
  return {
    id: actionable.id,
    window_start: actionable.window_start,
    window_end: actionable.window_end,
    decision: actionable.decision,
    objective_label: OBJECTIVE_AR[actionable.recommended_objective] || '',
    strategy_label: MECHANISM_AR[actionable.recommended_strategy] || '',
    quota: actionable.recommended_quota,
    explanation: actionable.explanation_partner,
    why,
  };
}

// "محتاجين منك شغلة" — approval-required decisions / offer requests
export async function readApprovalsNeeded(SR: any, rid: string) {
  const decisions = await SR.entities.DemandDecision
    .filter({ restaurant_id: rid, is_demo: true }, '-created_date', 50).catch(() => []);
  const approval = (decisions || []).filter((d: any) => d.decision === 'NEEDS_RESTAURANT_APPROVAL');
  const requests = await SR.entities.OfferRequest
    .filter({ restaurant_id: rid, status: 'submitted' }, '-created_date', 10).catch(() => []);
  return (approval || []).slice(0, 3).map((d: any) => ({
    id: d.id, type: 'approval',
    window_start: d.window_start, window_end: d.window_end,
    explanation: d.explanation_partner || 'السعر المقترح خارج الحد المتفق عليه',
  })).concat((requests || []).map((r: any) => ({
    id: r.id, type: 'offer_request', explanation: r.operational_reason || 'طلب عرض جديد',
  })));
}

// "خطة اليوم" — hourly timeline from DemandDayProfile (today's traffic-light)
export async function readTodayPlan(SR: any, rid: string, nowMs: number) {
  const today = new Date(nowMs).getDay();
  const dayProfiles = await SR.entities.DemandDayProfile
    .filter({ restaurant_id: rid }).catch(() => []);
  const dp = (dayProfiles || []).find((d: any) => d.day_of_week === today);
  const level = dp?.effective_demand_level || 'unknown';
  const tl = trafficLightFromDemand(level);
  // Build a simple 4-block day timeline from the traffic light
  return buildDayTimeline(tl);
}

// Full weekly time map (ساعات الشغل مع TAMAM)
export async function readWeeklyTimeMap(SR: any, rid: string) {
  const dayProfiles = await SR.entities.DemandDayProfile
    .filter({ restaurant_id: rid }).catch(() => []);
  const byDay: any = {};
  for (let d = 0; d < 7; d++) {
    const dp = (dayProfiles || []).find((x: any) => x.day_of_week === d);
    const level = dp?.effective_demand_level || 'unknown';
    const tl = trafficLightFromDemand(level);
    byDay[d] = { day: d, day_label: DAY_AR[d], level, traffic_light: tl, blocks: buildDayTimeline(tl) };
  }
  return byDay;
}

function buildDayTimeline(tl: string) {
  // 4 blocks: 12-15, 15-17, 18-21, 21-23
  // GREEN = TAMAM can push; RED = don't push; YELLOW = cautious
  // For a "quiet" (GREEN) day: mostly green with a red peak block
  // For a "busy" (RED) day: mostly red/yellow
  // For "medium" (YELLOW): mixed
  if (tl === 'GREEN') return [
    { time: '12–15', light: 'YELLOW', label: 'عادي' },
    { time: '15–17', light: 'GREEN', label: 'TAMAM تقوّي الشاورما' },
    { time: '18–21', light: 'RED', label: 'وقت ضغط — بدون حملات' },
    { time: '21–23', light: 'YELLOW', label: 'مراقبة / فرصة انتقائية' },
  ];
  if (tl === 'RED') return [
    { time: '12–15', light: 'YELLOW', label: 'عادي' },
    { time: '15–17', light: 'RED', label: 'ضغط — بدون حملات' },
    { time: '18–21', light: 'RED', label: 'ضغط — بدون حملات' },
    { time: '21–23', light: 'YELLOW', label: 'مراقبة' },
  ];
  return [
    { time: '12–15', light: 'GREEN', label: 'TAMAM تقدر تقوّي' },
    { time: '15–17', light: 'YELLOW', label: 'نشتغل بحذر' },
    { time: '18–21', light: 'RED', label: 'وقت ضغط' },
    { time: '21–23', light: 'YELLOW', label: 'مراقبة' },
  ];
}

// Capacity in human language
export function readCapacity(restaurant: any) {
  const cap = restaurant.capacity_normal_additional_per_hour || 10;
  return {
    value: cap,
    label: `${cap} طلب بالساعة`,
    desc: 'لما تكون الفترة هادية، قديش طلب زيادة بتقدر تستقبل بالساعة؟',
    updated_at: restaurant.updated_date || '',
    source: restaurant.capacity_source || 'heuristic_fallback',
    is_heuristic: !restaurant.capacity_normal_additional_per_hour,
  };
}

// Restaurant data status (معلومات مطعمك)
export async function readDataStatus(SR: any, rid: string) {
  const [menuItems, profile, dayProfiles, guardrails] = await Promise.all([
    SR.entities.RestaurantMealOffer.filter({ restaurant_id: rid }, 'display_order', 200).catch(() => []),
    SR.entities.WeeklyDemandProfile.filter({ restaurant_id: rid }).catch(() => []),
    SR.entities.DemandDayProfile.filter({ restaurant_id: rid }).catch(() => []),
    SR.entities.CommercialGuardrail.filter({ restaurant_id: rid, status: 'active' }).catch(() => []),
  ]);
  const hasMenu = (menuItems || []).length > 0;
  const hasProfile = (profile || []).length > 0 && (profile[0].operating_hours_json || '').length > 10;
  const hasDays = (dayProfiles || []).length >= 5;
  const hasCapacity = true; // demo always has capacity (heuristic fallback)
  const hasGuardrails = (guardrails || []).length > 0;
  return [
    { key: 'menu', label: 'المنيو', status: hasMenu ? 'مكتمل' : 'ناقص' },
    { key: 'hours', label: 'ساعات العمل', status: hasProfile ? 'مكتمل' : 'ناقص' },
    { key: 'weak_hours', label: 'الأوقات الهادية', status: hasDays ? 'مكتمل' : 'ناقص' },
    { key: 'capacity', label: 'القدرة التشغيلية', status: hasCapacity ? 'مكتمل' : 'ناقص' },
    { key: 'prices', label: 'حدود الأسعار', status: hasGuardrails ? 'مكتمل' : 'ناقص' },
    { key: 'goals', label: 'أهداف المطعم', status: 'مكتمل' },
  ];
}

// Demo hero cards — the "شو بدك تقوّي اليوم؟" story for the demo restaurant.
// Returns 4 populated cards (not "لسه بنجمع بيانات") with demo-isolated data.
export function demoHeroCards(): any[] {
  return [
    { key: 'weak_hour', available: true, hour: 15, count: 4,
      insight: 'الإثنين 15:00–17:00', detail: 'أهدأ فترة بالأسبوع' },
    { key: 'low_item', available: true, name: 'شاورما', count: 3,
      insight: 'شاورما', detail: 'مبيعاتها أقل من متوسط المنيو' },
    { key: 'new_customers', available: true,
      insight: 'في جمهور مناسب للتجربة الأولى', detail: 'زبائن قريبون ما جربوا المطعم' },
    { key: 'weak_day', available: true, day: 1, day_name: 'الإثنين', count: 12,
      insight: 'الإثنين', detail: 'أهدأ أيام الأسبوع' },
  ];
}

// Enhanced demo performance — reads from CampaignEvent + Campaign + CampaignOffer
// to produce a non-zero, realistic demo story (بيانات تجريبية).
export async function readDemoPerformance(SR: any, rid: string) {
  const [events, offers, camps] = await Promise.all([
    SR.entities.CampaignEvent.filter({ restaurant_id: rid, is_demo: true }, '-created_date', 500).catch(() => []),
    SR.entities.CampaignOffer.filter({ restaurant_id: rid, is_demo: true }, '-created_date', 200).catch(() => []),
    SR.entities.Campaign.filter({ restaurant_id: rid, is_demo: true }, '-created_date', 200).catch(() => []),
  ]);
  const purchases = (events || []).filter((e: any) => e.event_type === 'purchase');
  const unlocks = (events || []).filter((e: any) => e.event_type === 'unlock');
  const impressions = (events || []).filter((e: any) => e.event_type === 'impression');
  const campaignRevenue = purchases.reduce((s: number, e: any) => s + (e.amount || 0), 0);

  // New customers = unique user_ids in campaign purchase events
  const userIds = new Set(purchases.map((e: any) => e.user_id).filter(Boolean));
  const newCustomers = userIds.size;

  // Completed campaigns (status COMPLETED)
  const completedCampaigns = (camps || []).filter((c: any) => c.status === 'COMPLETED').length;

  // Stopped by limit: offers where quota used >= total and status is completed/sold_out
  const stoppedByLimit = (offers || []).filter((o: any) =>
    o.quota_total != null && (o.quota_used || 0) >= o.quota_total
    && ['completed', 'sold_out'].includes(o.status)
  ).length;

  // Best offer = offer with most purchases
  const offerCounts: any = {};
  purchases.forEach((e: any) => { if (e.offer_id) offerCounts[e.offer_id] = (offerCounts[e.offer_id] || 0) + 1; });
  let bestOfferId: string | null = null, bestCount = 0;
  for (const [id, cnt] of Object.entries(offerCounts)) { if ((cnt as number) > bestCount) { bestCount = cnt as number; bestOfferId = id; } }
  const bestOffer = bestOfferId ? (offers || []).find((o: any) => o.id === bestOfferId) : null;
  const bestOfferLabel = bestOffer ? cleanOfferTitle(bestOffer) : '';

  return {
    has_data: purchases.length > 0,
    campaign_orders: purchases.length,
    campaign_revenue: round2(campaignRevenue),
    new_customers: newCustomers,
    completed_campaigns: completedCampaigns,
    stopped_by_limit: stoppedByLimit,
    best_offer: bestOfferLabel,
    unlocks: unlocks.length,
    impressions: impressions.length,
    tamam_contribution: round2(purchases.reduce((s: number, e: any) => s + (e.tamam_revenue || 0), 0)),
    story: {
      window: 'الإثنين 15:00–17:00',
      situation: 'كان وقت هادي',
      action: 'TAMAM شغلت خطة زباين جدد',
      result: `${purchases.length} طلبات`,
      new_customers: `${newCustomers} زباين جدد`,
    },
  };
}

// Demo orders with fresh relative timestamps (read-only for partner display)
export async function readDemoOrders(SR: any, rid: string) {
  const orders = await SR.entities.RestaurantSubOrder
    .filter({ restaurant_id: rid, is_demo: true }, '-created_date', 50).catch(() => []);
  return (orders || []).map((o: any) => {
    let itemsCount = 0;
    try { const v = JSON.parse(o.items_json || '[]'); itemsCount = Array.isArray(v) ? v.length : (v?.items?.length || 0); } catch {}
    return {
      id: o.id, number: o.parent_order_number, status: o.status,
      total: o.total, created_date: o.created_date,
      items_count: itemsCount, customer_name: o.customer_name,
    };
  });
}

// Build the 4-step "why TAMAM" chain from a DemandDecision
export function buildWhyChain(d: any) {
  // Try to use the campaign why_tamam_json if linked, else synthesize from decision
  const scenarioMap: Record<string, { input: string; goal: string; limits: string; action: string }> = {
    F_high_intent_new_customer: {
      input: 'الإثنين 15:00–17:00 فترة هادية',
      goal: 'تجيب زباين جدد',
      limits: 'ما بدك نحرق سعر الشاورما',
      action: 'شاورما + تشيبس + كولا بـ 51 ₪ لأول 8 طلبات',
    },
  };
  if (d.scenario_key && scenarioMap[d.scenario_key]) return scenarioMap[d.scenario_key];
  // Synthesize from decision fields (partner-safe, no scores)
  const win = d.window_start ? fmtDayTime(d.window_start) : '';
  return {
    input: win ? `${win} فترة هادية عندك` : 'فترة هادية عندك',
    goal: OBJECTIVE_AR[d.recommended_objective] || 'نجيب طلبات زيادة',
    limits: 'ما بدك نحرق سعر الوجبة الأساسية',
    action: d.recommended_strategy
      ? `${MECHANISM_AR[d.recommended_strategy] || d.recommended_strategy}${d.recommended_quota ? ` — لحد ${d.recommended_quota} طلب` : ''}`
      : 'نشوف أفضل طريقة مع مطعمك',
  };
}