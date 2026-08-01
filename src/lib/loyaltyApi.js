import { base44 } from '@/api/base44Client';

async function call(action, payload = {}) {
  const res = await base44.functions.invoke('loyaltyEngine', { action, payload });
  return res.data.data;
}

export const getLoyaltyConfig = () => call('getConfig').catch(() => null);
export const getLoyaltyAccount = (phone) => call('getAccount', { phone }).catch(() => null);
export const recordPendingPoints = (p) => call('recordPending', p).catch(() => null);
export const awardOrderPoints = (p) => call('awardPoints', p).catch(() => null);
export const reverseOrderPoints = (orderId) => call('reversePoints', { order_id: orderId }).catch(() => null);
export const validateCoupon = (p) => call('validateCoupon', p).catch(() => ({ valid: false, reason: 'ما قدرنا نتحقق من الكوبون.' }));
export const redeemPoints = (p) => call('redeemPoints', p).catch(() => ({ ok: false, reason: 'ما قدرنا نستبدل النقاط.' }));
export const markCouponUsed = (code) => call('markCouponUsed', { code }).catch(() => null);

export function expectedPoints(config, amount) {
  if (!config) return 0;
  const p = (config.points_per_currency || 1) * (amount || 0);
  const r = config.points_rounding || 'floor';
  return r === 'ceil' ? Math.ceil(p) : r === 'round' ? Math.round(p) : Math.floor(p);
}