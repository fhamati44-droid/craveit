import { base44 } from '@/api/base44Client';
import { getRestaurants as apiRestaurants, getMenuItemsByRestaurant } from '@/lib/api';
import { getSessionId } from '@/lib/tamamApi';

// ---- Entity CRUD (admin role) ----
export const getGroupDeals = (status) =>
  base44.entities.GroupDeal.list('-updated_date', 200).then((list) =>
    (list || []).filter((d) => !status || d.status === status)
  );

export const getGroupDeal = (id) => base44.entities.GroupDeal.get(id);

export const getGroupDealItems = (dealId) => base44.entities.GroupDealItem.filter({ deal_id: dealId });
export const getGroupDealThresholds = (dealId) => base44.entities.GroupDealThreshold.filter({ deal_id: dealId });
export const getGroupDealParticipations = (dealId) => base44.entities.GroupDealParticipation.filter({ deal_id: dealId });
export const getGroupDealAudit = (dealId) => base44.entities.GroupDealAuditLog.filter({ deal_id: dealId }).then((l) => l.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));

export async function saveGroupDeal(draft) {
  if (draft.id) return base44.entities.GroupDeal.update(draft.id, draft);
  return base44.entities.GroupDeal.create({ ...draft, status: draft.status || 'draft' });
}

export async function replaceDealItems(dealId, items) {
  const existing = await getGroupDealItems(dealId);
  await Promise.all((existing || []).map((it) => base44.entities.GroupDealItem.delete(it.id).catch(() => null)));
  await base44.entities.GroupDealItem.bulkCreate(
    items.map((it, i) => ({
      deal_id: dealId,
      restaurant_id: it.restaurant_id,
      meal_id: it.meal_id,
      meal_name_snapshot: it.meal_name_snapshot,
      image_snapshot: it.image_snapshot,
      base_price_snapshot: it.base_price_snapshot,
      quantity_included: it.quantity_included || 1,
      variant_id: it.variant_id || null,
      customization_snapshot: it.customization_snapshot || '',
      sort_order: i,
    }))
  );
}

export async function replaceDealThresholds(dealId, thresholds) {
  const existing = await getGroupDealThresholds(dealId);
  await Promise.all((existing || []).map((t) => base44.entities.GroupDealThreshold.delete(t.id).catch(() => null)));
  await base44.entities.GroupDealThreshold.bulkCreate(
    thresholds.map((t, i) => ({
      deal_id: dealId,
      min_participants: Number(t.min_participants) || 0,
      max_participants: t.max_participants || null,
      min_quantity: t.min_quantity || null,
      price: Number(t.price) || 0,
      discount_percentage: t.discount_percentage || 0,
      label: t.label || '',
      is_success_threshold: !!t.is_success_threshold,
      is_best_tier: !!t.is_best_tier,
      sort_order: i,
    }))
  );
}

export async function logAudit(dealId, dealTitle, action, prev, next, reason) {
  const user = await base44.auth.me().catch(() => null);
  return base44.entities.GroupDealAuditLog.create({
    deal_id: dealId,
    deal_title: dealTitle || '',
    action,
    admin_id: user?.id || '',
    admin_name: user?.full_name || '',
    previous_value: prev ? JSON.stringify(prev) : '',
    new_value: next ? JSON.stringify(next) : '',
    reason: reason || '',
  }).catch(() => null);
}

// ---- Engine calls ----
const engine = (action, payload) => base44.functions.invoke('groupDealEngine', { action, payload }).then((r) => r.data);

export const listPublicDeals = () => {
  const phone = localStorage.getItem('user_phone') || '';
  return engine('listPublicDeals', { phone, session_id: getSessionId() }).then((d) => d.data);
};

export const fetchDealProgress = (deal_id) => {
  const phone = localStorage.getItem('user_phone') || '';
  return engine('getDealProgress', { deal_id, phone, session_id: getSessionId() }).then((d) => d.data);
};
export const joinGroupDeal = (deal_id, { name, phone, quantity, payment_method }) =>
  engine('joinGroupDeal', { deal_id, name, phone, session_id: getSessionId(), quantity, payment_method }).then((d) => d.data);
export const finalizeGroupDeal = (deal_id, reason) =>
  engine('finalizeGroupDeal', { deal_id, reason }).then((d) => d.data);
export const validateDealForPublish = (deal, items, thresholds) =>
  engine('validateDeal', { deal, items, thresholds }).then((d) => d.data);
export const publishGroupDeal = (deal_id) => engine('adminPublishDeal', { deal_id }).then((d) => d.data);
export const transitionGroupDeal = (deal_id, to, reason, field) =>
  engine('adminTransition', { deal_id, to, reason, field }).then((d) => d.data);
export const duplicateGroupDeal = (deal_id) => engine('adminDuplicateDeal', { deal_id }).then((d) => d.data);

// ---- Restaurant & meal selectors (existing data) ----
export const fetchRestaurantsForSelect = () => apiRestaurants();
export const fetchMealsForRestaurant = (restaurantId) => getMenuItemsByRestaurant(restaurantId);

// ---- Client-side tier/status helpers (display only; payment uses engine) ----
export function sortTiers(thresholds) {
  return [...(thresholds || [])].sort(
    (a, b) => (a.min_participants || 0) - (b.min_participants || 0) || (a.sort_order || 0) - (b.sort_order || 0)
  );
}

export function measureFor(method, participants, quantity) {
  if (method === 'quantity') return quantity || 0;
  if (method === 'both') return Math.max(participants || 0, quantity || 0);
  return participants || 0;
}

export function currentTier(thresholds, participants, quantity, method) {
  const sorted = sortTiers(thresholds);
  if (!sorted.length) return null;
  const m = measureFor(method, participants, quantity);
  let t = sorted[0];
  for (const tier of sorted) if (m >= (tier.min_participants || 0)) t = tier;
  return t;
}

export function nextTier(thresholds, participants, quantity, method) {
  const sorted = sortTiers(thresholds);
  const m = measureFor(method, participants, quantity);
  return sorted.find((t) => (t.min_participants || 0) > m) || null;
}

export function computeDealStatus(deal, now = Date.now()) {
  if (deal?.finalized) return deal.status; // completed | failed
  if (['paused', 'cancelled', 'draft'].includes(deal?.status)) return deal.status;
  const start = deal?.start_at ? new Date(deal.start_at).getTime() : 0;
  const end = deal?.end_at ? new Date(deal.end_at).getTime() : Infinity;
  if (now < start) return 'scheduled';
  if (now >= end) return 'ended';
  return 'active';
}

export const STATUS_LABELS = {
  draft: 'مسودة',
  scheduled: 'مجدول',
  active: 'نشط',
  paused: 'متوقف',
  ended: 'منتهي',
  completed: 'مكتمل',
  failed: 'فاشل',
  cancelled: 'ملغى',
};

export const PAYMENT_MODEL_LABELS = {
  reserve: 'احجز وادفع السعر النهائي',
  pay_current: 'ادفع الحالي وارتجع الفرق',
  join_only: 'انضم وادفع بعد التثبيت',
  cod: 'الدفع عند الاستلام',
};

export const COUNTING_LABELS = {
  participants: 'حسب عدد العملاء',
  quantity: 'حسب إجمالي الكمية',
  both: 'حسب الاثنين معًا',
};

export function pad(n) {
  return String(Math.max(0, n)).padStart(2, '0');
}

export function tierProgress(thresholds, participants) {
  const sorted = sortTiers(thresholds);
  if (!sorted.length) return 0;
  const max = sorted[sorted.length - 1].min_participants || 1;
  return Math.min(100, Math.round((participants / max) * 100));
}

export function countdown(endAt) {
  if (!endAt) return null;
  const end = new Date(endAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
  return { h: Math.floor(diff / 3.6e6), m: Math.floor((diff % 3.6e6) / 6e4), s: Math.floor((diff % 6e4) / 1000), expired: false };
}