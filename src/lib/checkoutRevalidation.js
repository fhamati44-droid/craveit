// Real-checkout UnifiedOffer safety layer.
// Called from CheckoutProcessing.finalize() BEFORE createOrder. The server
// (campaignEngine.revalidateCheckout / consumeQuota) is the ONLY price/quota
// authority — frontend cart values are never trusted for price/eligibility/quota.
//
// Flow: revalidate every unified-offer cart item → if stale/invalid/unavailable,
// return an issue and STOP (no order at a stale price). Then atomically reserve
// quota (CAS) → if sold out, return an issue and STOP. Only then does the order
// get created. Quota is consumed at the successful-order boundary, never on
// view/unlock/add-to-cart/checkout-open.

import { revalidateUnifiedCheckout, consumeUnifiedQuota } from '@/lib/unifiedOfferApi';

const DEMO_KEY = 'tamam_offer_lab_demo';

// Demo-only test harness context (set by the Offer Validation Lab). In
// production this is absent → include_demo=false and test_time is ignored,
// so the backend always uses real server time.
export function getDemoCheckoutContext() {
  try {
    const raw = (typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_KEY)) || null;
    if (!raw) return null;
    const o = JSON.parse(raw);
    return { include_demo: !!o.include_demo, test_time: o.test_time || null };
  } catch { return null; }
}
export function setDemoCheckoutContext(ctx) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(ctx || {})); } catch {}
}
export function clearDemoCheckoutContext() {
  try { localStorage.removeItem(DEMO_KEY); } catch {}
}

const REASON_KIND = {
  expired: 'offer_changed',
  price_changed: 'offer_changed',
  offer_inactive: 'offer_changed',
  sold_out: 'sold_out',
  restaurant_unavailable: 'restaurant_unavailable',
  item_unavailable: 'item_unavailable',
  restaurant_mismatch: 'restaurant_unavailable',
  item_mismatch: 'item_unavailable',
};

// Returns null if all offer items are valid and prices match; otherwise a
// structured issue object the checkout renders to the customer.
export async function revalidateCartOffers({ items, phone }) {
  const demo = getDemoCheckoutContext();
  const offerItems = items.filter((i) => i.unified_offer_id && i.unified_offer_source);
  for (const it of offerItems) {
    let res;
    try {
      res = await revalidateUnifiedCheckout({
        source_type: it.unified_offer_source,
        id: it.unified_offer_id,
        restaurant_id: it.selected_restaurant_id || null,
        restaurant_item_id: it.restaurant_menu_item_id || null,
        phone,
        include_demo: demo?.include_demo,
        test_time: demo?.test_time,
      });
    } catch (e) {
      return { kind: 'error', item: it.name, cartId: it.cartId, source_type: it.unified_offer_source, offer_id: it.unified_offer_id, message: e?.message || 'revalidation_failed' };
    }
    if (!res || res.valid === false) {
      const reason = res?.reason_if_unavailable || 'invalid';
      return {
        kind: REASON_KIND[reason] || 'offer_changed',
        item: it.name,
        cartId: it.cartId,
        source_type: it.unified_offer_source,
        offer_id: it.unified_offer_id,
        previous_price: it.price,
        current_price: res?.authoritative_price ?? null,
        fallback_price: res?.normal_price ?? null,
        card_state: res?.card_state || 'EXPIRED',
        reason,
        restaurant_available: !!res?.restaurant_fulfillment,
        message_ar: messageFor(reason),
      };
    }
    // Valid offer but server authoritative price differs from cart price → stale price.
    if (res.authoritative_price != null && it.price != null && Math.round(res.authoritative_price) !== Math.round(it.price)) {
      return {
        kind: 'offer_changed',
        item: it.name,
        cartId: it.cartId,
        source_type: it.unified_offer_source,
        offer_id: it.unified_offer_id,
        previous_price: it.price,
        current_price: res.authoritative_price,
        fallback_price: res.normal_price ?? res.authoritative_price,
        card_state: res.card_state,
        reason: 'price_changed',
        restaurant_available: !!res?.restaurant_fulfillment,
        message_ar: 'سعر العرض تغيّر قبل ما نكمل الطلب.',
      };
    }
  }
  return null;
}

// Atomically reserve one quota slot per offer item (per quantity) via CAS.
// Returns null if all reserved, or a SOLD_OUT issue if any fails. On failure the
// order is NOT created — exactly one customer wins the last slot.
export async function reserveCartQuota({ items }) {
  const demo = getDemoCheckoutContext();
  for (const it of items.filter((i) => i.unified_offer_id && i.unified_offer_source)) {
    const qty = Math.max(1, it.quantity || 1);
    for (let k = 0; k < qty; k++) {
      const res = await consumeUnifiedQuota({
        source_type: it.unified_offer_source,
        id: it.unified_offer_id,
        include_demo: demo?.include_demo,
        test_time: demo?.test_time,
      });
      if (!res || res.consumed === false) {
        return {
          kind: 'sold_out',
          item: it.name,
          cartId: it.cartId,
          source_type: it.unified_offer_source,
          offer_id: it.unified_offer_id,
          reason: res?.reason || 'sold_out',
          message_ar: res?.message_ar || 'العرض خلص قبل ما نكمل الطلب.',
          fallback_price: null,
        };
      }
    }
  }
  return null;
}

function messageFor(reason) {
  switch (reason) {
    case 'expired': return 'العرض انتهى قبل ما نكمل الطلب.';
    case 'item_unavailable': return 'الوجبة صارت مش متوفرة هسّا.';
    case 'restaurant_unavailable': return 'المطعم صار مش متاح هسّا.';
    case 'sold_out': return 'العرض خلص قبل ما نكمل الطلب.';
    default: return 'ما قدرنا نكمل بهذا العرض هسّا.';
  }
}

export function hasOfferItems(items) {
  return (items || []).some((i) => i.unified_offer_id && i.unified_offer_source);
}