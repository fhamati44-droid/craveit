import { base44 } from '@/api/base44Client';

// Unified customer Offer eligibility + point-unlock client.
// All data is proxied through the offerEngine backend (entities are admin-only
// and read server-side; the frontend never touches OfferRule/OfferUnlock).
const call = (action, payload = {}) =>
  base44.functions.invoke('offerEngine', { action, payload }).then((r) => r?.data?.data ?? r?.data ?? r);

export const listKhabya = (phone) => call('listKhabya', { phone });
export const getOfferEligibility = (deal_id, phone) => call('getEligibility', { deal_id, phone });
export const unlockOffer = (deal_id, phone) => call('unlockOffer', { deal_id, phone });
export const getMyUnlocks = (phone) => call('getUnlocks', { phone });

// Card-state label map (Arabic, customer-facing) — single source of truth.
export const CARD_STATE_LABEL = {
  NORMAL: 'السعر العادي',
  LOCKED_POINTS: 'مخبّأة 🔒',
  UNLOCKED: 'مفتوحة ✅',
  UPCOMING: 'قريباً',
  ACTIVE: 'متاح',
  SOLD_OUT: 'خلص العرض',
  EXPIRED: 'انتهى وقت العرض',
  NOT_ELIGIBLE: 'غير متاح إلك',
};

export function fmtUntil(iso) {
  if (!iso) return '';
  try {
    return 'لحد ' + new Date(iso).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}