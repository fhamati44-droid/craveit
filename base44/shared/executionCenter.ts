// ============================================================================
// executionCenter — enrichment helpers for the Admin Execution Center UI.
// Turns raw CampaignPlan rows into human-readable operation cards with live
// offer state, health, learning, and timeline data. SDK-free pure helpers
// driven by a service-role client passed in by the backend function.
// ============================================================================

import { MONITOR_STATE_AR, PLAN_STATUS_AR } from './demandExecutionConfig.ts';
import { AUDIENCE_LABEL_AR } from './campaignCommerce.ts';

function now() { return Date.now(); }
function round2(n: number) { return Math.round((n || 0) * 100) / 100; }
function tryParse(s: any): any { try { return typeof s === 'string' ? JSON.parse(s) : (s || null); } catch { return null; } }
function hhmm(d: Date) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

// ---- offerStatus mirror (campaignEngine) ----
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

export const HEALTH_AR: Record<string, string> = {
  HEALTHY: 'شغالة طبيعي',
  UNDERPERFORMING: 'الأداء أقل من المتوقع',
  CAPACITY_RISK: 'في ضغط تشغيلي',
  COMMERCIAL_RISK: 'في مخاطرة تجارية',
  SOLD_OUT: 'خلصت الكمية',
  EXPIRED: 'انتهى الوقت',
  PAUSED_OPERATIONAL: 'موقوفة بسبب التشغيل',
  NEEDS_REVIEW: 'تحتاج مراجعة',
  UNKNOWN: 'غير معروف',
};

export const HEALTH_COLOR: Record<string, string> = {
  HEALTHY: 'green', UNDERPERFORMING: 'amber', CAPACITY_RISK: 'red', COMMERCIAL_RISK: 'red',
  SOLD_OUT: 'gray', EXPIRED: 'gray', PAUSED_OPERATIONAL: 'amber', NEEDS_REVIEW: 'amber', UNKNOWN: 'gray',
};

export const LEARNING_AR: Record<string, string> = {
  STRONG: 'معلومة قابلة للاستخدام',
  MODERATE: 'أداء متوسط',
  WEAK: 'أداء ضعيف',
  INSUFFICIENT_DATA: 'بيانات غير كافية',
  CONFOUNDED: 'نتائج مشوشة بتداخل حملات',
  INTERRUPTED: 'الحملة تأثرت بضغط تشغيلي',
};

export const OBJECTIVE_AR: Record<string, string> = {
  DEMAND_RECOVERY: 'استعادة الطلب الفوري',
  CUSTOMER_ACQUISITION: 'زباين جدد',
  REACTIVATION: 'إعادة الزباين الغائبين',
  AOV_GROWTH: 'رفع متوسط السلة',
  SURPLUS: 'تفريغ فائض الكمية',
  LOYALTY: 'تفعيل النقاط والولاء',
  CONVERSION_RECOVERY: 'استرداد النية العالية',
  PRODUCT_STRENGTHENING: 'تقوية صنف معين',
  NEW_CUSTOMERS: 'زباين جدد',
  INCREASE_AOV: 'رفع متوسط السلة',
  IMMEDIATE_DEMAND: 'طلب فوري',
  LOYALTY_ENGAGEMENT: 'تفعيل النقاط والولاء',
  CONVERSION_RECOVERY: 'استرداد النية',
  STRENGTHEN_ITEM: 'تقوية صنف',
  REPEAT_PURCHASE: 'تكرار الطلب',
  PAYDAY_AOV: 'يوم الراتب — رفع السلة',
  ACQUISITION: 'جذب زباين',
};

export const MECHANISM_AR: Record<string, string> = {
  NO_DISCOUNT: 'إبراز بدون خصم',
  VALUE_ADD: 'قيمة مضافة',
  MIX_VALUE: 'ميكس بقيمة مضافة',
  POINT_LOCKED: 'عرض بالنقاط',
  LIMITED_QUANTITY: 'كمية محدودة',
  FIRST_TRIAL: 'تجربة أولى',
  TIME_AND_QUANTITY: 'وقت وكمية',
  PERSONALIZED_VALUE: 'قيمة شخصية',
  PLUS_UPSELL: 'بلس — ترقية السلة',
  DIRECT_PRICE: 'خصم مباشر',
};

export const RESTAURANT_STATUS_AR: Record<string, string> = {
  open: 'جاهز',
  closed: 'مقفل',
  busy: 'مشغول',
  temporarily_unavailable: 'غير متاح مؤقتاً',
};

export const CARD_STATE_AR: Record<string, string> = {
  active: 'متاحة',
  scheduled: 'مجدولة',
  expired: 'منتهية',
  sold_out: 'نفدت',
  paused: 'موقوفة',
  completed: 'مكتملة',
};

function variantAr(v?: string): string {
  if (!v) return '';
  const m: Record<string, string> = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };
  return m[v] || v;
}

// ---- batch fetch by ids ($in with per-id fallback) ----
async function fetchByIds(SR: any, entityName: string, ids: string[], field = 'id'): Promise<any[]> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return [];
  try {
    const q: any = field === 'id' ? { id: { $in: uniq } } : { [field]: { $in: uniq } };
    const r = await SR.entities[entityName].filter(q);
    if (r && r.length) return r;
  } catch { /* fall through to per-id */ }
  if (field !== 'id') return [];
  const out: any[] = [];
  for (const id of uniq) { const x = await SR.entities[entityName].get(id).catch(() => null); if (x) out.push(x); }
  return out;
}

// ============================================================================
// enrichPlans — build operation-card view models from raw CampaignPlan rows.
// ============================================================================
export async function enrichPlans(SR: any, plans: any[], evalMs: number): Promise<any[]> {
  if (!plans || !plans.length) return [];
  const ddIds = [...new Set(plans.map((p: any) => p.demand_decision_id).filter(Boolean))];
  const offerIds = [...new Set(plans.map((p: any) => p.campaign_offer_id).filter(Boolean))];
  const planIds = plans.map((p: any) => p.id).filter(Boolean);
  const rids = [...new Set(plans.map((p: any) => p.restaurant_id).filter(Boolean))];

  const [ddsRaw, offersRaw, learnRaw, restsRaw] = await Promise.all([
    fetchByIds(SR, 'DemandDecision', ddIds),
    fetchByIds(SR, 'CampaignOffer', offerIds),
    fetchByIds(SR, 'CampaignLearning', planIds, 'campaign_plan_id'),
    fetchByIds(SR, 'Restaurant', rids),
  ]);
  const ddMap: Record<string, any> = {}; (ddsRaw || []).forEach((d: any) => { ddMap[d.id] = d; });
  const offerMap: Record<string, any> = {}; (offersRaw || []).forEach((o: any) => { offerMap[o.id] = o; });
  const learnMap: Record<string, any> = {}; (learnRaw || []).forEach((l: any) => { learnMap[l.campaign_plan_id] = l; });
  const restMap: Record<string, any> = {}; (restsRaw || []).forEach((r: any) => { restMap[r.id] = r; });

  // items (from dd.restaurant_item_id)
  const itemIds = [...new Set(Object.values(ddMap).map((d: any) => d?.restaurant_item_id).filter(Boolean))] as string[];
  const itemsRaw = await fetchByIds(SR, 'RestaurantMealOffer', itemIds);
  const itemMap: Record<string, any> = {}; (itemsRaw || []).forEach((it: any) => { itemMap[it.id] = it; });

  // pressure signals per restaurant (batch)
  const sigsByRest: Record<string, any[]> = {};
  for (const rid of rids) sigsByRest[rid] = await SR.entities.RestaurantOperationalSignal.filter({ restaurant_id: rid, status: 'active' }).catch(() => []);

  const out: any[] = [];
  for (const p of plans) {
    const dd = ddMap[p.demand_decision_id] || null;
    const rest = restMap[p.restaurant_id] || null;
    const item = dd?.restaurant_item_id ? itemMap[dd.restaurant_item_id] : null;
    const offer = p.campaign_offer_id ? offerMap[p.campaign_offer_id] : null;
    const learning = learnMap[p.id] || null;
    const sigs = sigsByRest[p.restaurant_id] || [];
    const pressure = !!(sigs || []).some((s: any) => s.type === 'kitchen_pressure' || s.type === 'temporary_pause');
    const restaurantOpen = !!(rest && rest.current_status === 'open' && rest.accepts_orders);

    const productLabel = item
      ? `${item.restaurant_product_name || item.meal_name_snapshot || 'وجبة'}${p.variant ? ' ' + variantAr(p.variant) : ''}`
      : (p.variant ? variantAr(p.variant) : 'وجبة TAMAM');

    // live state (only when an offer exists)
    let live: any = null;
    if (offer) {
      const st = offerStatus(offer, evalMs);
      const total = offer.quota_total == null ? null : offer.quota_total;
      const used = offer.quota_used || 0;
      const remaining = total != null ? Math.max(0, total - used) : null;
      const winEnd = offer.end_at ? new Date(offer.end_at).getTime() : Infinity;
      const timeRemainingMs = Math.max(0, winEnd - evalMs);
      live = {
        offer_status: st,
        card_state_ar: CARD_STATE_AR[st] || st,
        quota_used: used, quota_total: total, quota_remaining: remaining,
        time_remaining_ms: timeRemainingMs,
        restaurant_status: rest?.current_status || 'open',
        restaurant_status_ar: RESTAURANT_STATUS_AR[rest?.current_status || 'open'] || rest?.current_status || '—',
        restaurant_open: restaurantOpen,
        pressure,
        customer_price: offer.customer_price,
        commercial_spend: round2((offer.tamam_contribution || 0) * used),
      };
    }

    const monitorState = p.monitor_state || 'UNKNOWN';
    const health = { state: monitorState, label_ar: HEALTH_AR[monitorState] || monitorState, color: HEALTH_COLOR[monitorState] || 'gray' };

    let learnSummary: any = null;
    if (learning) {
      learnSummary = {
        result_status: learning.result_status,
        label_ar: LEARNING_AR[learning.result_status] || learning.result_status,
        actual_orders: learning.actual_orders,
        estimated_incremental_orders: learning.estimated_incremental_orders,
        expected_incremental_orders: learning.expected_incremental_orders,
        baseline_orders: learning.baseline_orders,
        revenue: learning.revenue, restaurant_settlement: learning.restaurant_settlement,
        tamam_contribution: learning.tamam_contribution, tamam_retained_revenue: learning.tamam_retained_revenue,
        incidents: learning.operational_incidents || [], confidence: learning.confidence,
        learning_summary: learning.learning_summary || '',
      };
    }

    // conflict (only meaningfully computable for live/scheduled plans; cheap signal here)
    const gate = p.safety_gate_json ? tryParse(p.safety_gate_json) : null;
    const conflictFlag = gate && gate.no_conflicting_offer && gate.no_conflicting_offer.ok === false;

    out.push({
      id: p.id,
      status: p.status,
      status_ar: PLAN_STATUS_AR[p.status] || p.status,
      restaurant_id: p.restaurant_id,
      restaurant_name: rest?.name_ar || rest?.name || '—',
      restaurant_status: rest?.current_status || 'open',
      restaurant_status_ar: RESTAURANT_STATUS_AR[rest?.current_status || 'open'] || '—',
      restaurant_open: restaurantOpen,
      product_label: productLabel,
      objective: p.objective,
      objective_ar: OBJECTIVE_AR[p.objective] || p.objective || '—',
      mechanism: p.mechanism,
      mechanism_ar: MECHANISM_AR[p.mechanism] || p.mechanism || '—',
      variant: p.variant,
      audience_segment: p.audience_segment,
      audience_label_ar: AUDIENCE_LABEL_AR[p.audience_segment] || p.audience_segment || '—',
      audience_size: p.audience_size,
      start_at: p.start_at, end_at: p.end_at,
      planned_quota: p.planned_quota, final_quota: p.final_quota,
      customer_price: p.customer_price, normal_reference_price: p.normal_reference_price,
      tamam_contribution: p.tamam_contribution, restaurant_contribution: p.restaurant_contribution,
      expected_settlement: p.expected_settlement, expected_incremental_orders: p.expected_incremental_orders,
      expected_tamam_contribution_cost: p.expected_tamam_contribution_cost,
      execution_mode: p.execution_mode,
      automation_mode_snapshot: p.automation_mode_snapshot,
      explore_exploit: p.explore_exploit, learning_mode: p.learning_mode,
      monitor_state: monitorState, health,
      safety_gate: gate,
      kill_reason: p.kill_reason, plan_reason_ar: p.plan_reason_ar,
      campaign_id: p.campaign_id, campaign_offer_id: p.campaign_offer_id,
      live, learning: learnSummary,
      conflict_flag: !!conflictFlag,
      data_confidence_score: dd?.data_confidence_score ?? null,
      opportunity_score: dd?.opportunity_score ?? null,
      commercial_safe: dd?.commercial_safe ?? null,
      cannibalization_risk: dd?.cannibalization_risk ?? null,
      demand_decision_id: p.demand_decision_id, opportunity_id: p.opportunity_id,
      is_demo: p.is_demo, created_date: p.created_date,
      valid_until: dd?.valid_until || null,
    });
  }
  return out;
}

// ---- build a today/week timeline from enriched plans ----
export function buildTimeline(enriched: any[], evalMs: number): any[] {
  return enriched
    .filter((p) => p.start_at)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .map((p) => ({
      plan_id: p.id,
      restaurant_name: p.restaurant_name,
      product_label: p.product_label,
      start_at: p.start_at,
      end_at: p.end_at,
      status: p.status,
      status_ar: p.status_ar,
      health: p.health,
    }));
}