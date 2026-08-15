import { base44 } from '@/api/base44Client';

// ============================================================================
// Unified Offer Service — ONE customer-facing contract over the two existing
// offer backends (CampaignOffer via campaignEngine, GroupDeal via offerEngine).
// Customer components call ONLY this module; they never know which backend
// produced an offer. source_type is internal and must NOT be rendered to users.
// ============================================================================

const campaignCall = (action, payload = {}) =>
  base44.functions.invoke('campaignEngine', { action, payload }).then((r) => r?.data?.data ?? r?.data ?? r);
const offerCall = (action, payload = {}) =>
  base44.functions.invoke('offerEngine', { action, payload }).then((r) => r?.data?.data ?? r?.data ?? r);

// ---- List / resolve (server-side merge + deterministic precedence) ----
export const listUnifiedOffers = ({ restaurant_id, phone, include_demo, variant } = {}) =>
  campaignCall('unifiedList', { restaurant_id, phone, include_demo, variant });

export const resolveUnifiedOffer = ({ restaurant_id, variant, restaurant_item_id, tamam_product_id, phone, include_demo }) =>
  campaignCall('unifiedResolve', { restaurant_id, variant, restaurant_item_id, tamam_product_id, phone, include_demo });

export const getUnifiedOffer = ({ source_type, id, phone, include_demo, test_time }) =>
  campaignCall('unifiedGet', { source_type, id, phone, include_demo, test_time });

// ---- Pre-restaurant resolution (Mood → MealSet → product mapping → fulfillments) ----
// Does NOT require a restaurant_id. Returns every mapped, available restaurant
// that carries the TAMAM product, each with its best unified offer (if any).
export const resolveUnifiedOfferByMealSet = ({ tamam_product_id, tamam_product_ids, mealset_variant_id, variant, phone, include_demo, test_time }) =>
  campaignCall('unifiedResolveByMealSet', { tamam_product_id, tamam_product_ids, mealset_variant_id, variant, phone, include_demo, test_time });

// ---- Checkout revalidation — server is the ONLY price authority ----
export const revalidateUnifiedCheckout = ({ source_type, id, restaurant_id, restaurant_item_id, phone, include_demo, test_time }) =>
  campaignCall('revalidateCheckout', { source_type, id, restaurant_id, restaurant_item_id, phone, include_demo, test_time });

// ---- Atomic quota consumption (prevents overselling under concurrency) ----
export const consumeUnifiedQuota = ({ source_type, id, include_demo, test_time }) => {
  if (source_type === 'CAMPAIGN') return campaignCall('consumeQuota', { offer_id: id, include_demo, test_time });
  // GroupDeal participation has its own atomic join flow in offerEngine.
  return Promise.resolve({ consumed: false, reason: 'not_campaign_offer' });
};

// ---- Unlock (routes to the correct backend; each is idempotent per deal_id) ----
export const unlockUnifiedOffer = ({ source_type, id, phone, channel, include_demo, test_time }) => {
  if (source_type === 'CAMPAIGN') return campaignCall('unlockOffer', { offer_id: id, phone, channel, include_demo, test_time });
  if (source_type === 'GROUP_DEAL') return offerCall('unlockOffer', { deal_id: id, phone });
  return Promise.reject(new Error('unknown_source'));
};

// ---- Attribution (routes events back to the source system) ----
export const recordUnifiedOfferEvent = ({ source_type, id, event_type, channel, phone, campaign_id, restaurant_id }) => {
  if (source_type === 'CAMPAIGN') return campaignCall('recordEvent', { offer_id: id, event_type, channel: channel || 'direct', phone, campaign_id, restaurant_id });
  // Legacy GroupDeal attribution is preserved by its own join/purchase flow; no
  // separate event endpoint exists. We no-op here so the unified UI stays simple.
  return Promise.resolve({ ok: true, source_type: 'GROUP_DEAL', event_type });
};

// ---- Customer-facing card-state labels (single source of truth, Arabic) ----
export const UNIFIED_CARD_STATE_LABEL = {
  NORMAL: 'السعر العادي',
  LOCKED_POINTS: 'مخبّأة 🔒',
  UNLOCKED: 'مفتوحة ✅',
  UPCOMING: 'قريباً',
  ACTIVE: 'متاح',
  SOLD_OUT: 'خلص العرض',
  EXPIRED: 'انتهى وقت العرض',
  NOT_ELIGIBLE: 'غير متاح إلك',
};

// ---- Offer-type badge (customer-facing, source-agnostic) ----
export function offerBadgesAr(u) {
  if (!u) return [];
  const b = [];
  if (u.unlock_type === 'point_locked') b.push('خبايا بالنقاط');
  if (u.value_add) b.push('قيمة مضافة');
  if (u.quota_total != null) b.push('كمية محدودة');
  if (u.normal_price && u.customer_price && u.customer_price < u.normal_price) b.push('خصم');
  if (u.card_state === 'UPCOMING') b.push('قريباً');
  return b;
}

export function effectivePrice(u) {
  return u && u.customer_price != null ? u.customer_price : (u && u.normal_price) || null;
}

export function deepLinkFor(u) {
  if (!u) return '';
  return `/offer/${u.source_type}/${u.id}`;
}