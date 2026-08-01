// Order numbering, phone validation, fulfillment + status mapping for the TAMAM flow.

export function genOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `TAM-${ymd}-${seq}`;
}
export function genDeliveryRef() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `DLV-${ymd}-${seq}`;
}

export function normalizePhone(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/[^\d+]/g, '');
  if (p.startsWith('+972')) p = p.slice(4);
  else if (p.startsWith('972')) p = p.slice(3);
  if (p.startsWith('0')) p = p.slice(1);
  return '972' + p;
}
export function isValidIsraeliPhone(raw) {
  if (!raw) return false;
  const p = String(raw).replace(/[^\d]/g, '');
  return /^9725[0-9]{8}$/.test(p) || /^05[0-9]{8}$/.test(p);
}

export const STAGES = [
  { key: 'new', label: 'تم استلام الطلب', desc: 'وصلنا طلبك وعم نستنى تأكيد المطعم.', icon: 'receipt_long' },
  { key: 'confirmed', label: 'بانتظار تأكيد المطعم', desc: 'أرسلنا الطلب للمطعم، عم نستنى التأكيد.', icon: 'hourglass_top' },
  { key: 'preparing', label: 'المطعم أكد الطلب · قيد التحضير', desc: 'المطعم عم يجهز طلبك. الخطوة الجاية تجهيز الطلب للمندوب.', icon: 'soup_kitchen' },
  { key: 'ready', label: 'الطلب جاهز', desc: 'طلبك جاهز، عم نعيّن مندوب للتوصيل.', icon: 'check_circle' },
  { key: 'courier_assigned', label: 'تم تعيين مندوب', desc: 'تم تعيين مندوب للتوصيل، رح يصل للمطعم يستلم طلبك.', icon: 'delivery_dining' },
  { key: 'picked_up', label: 'المندوب استلم الطلب', desc: 'المندوب استلم طلبك من المطعم.', icon: 'directions_run' },
  { key: 'on_the_way', label: 'الطلب بالطريق', desc: 'المندوب استلم طلبك وهو بطريقه للعنوان.', icon: 'moped' },
  { key: 'arriving_soon', label: 'المندوب قرب يوصل', desc: 'المندوب قرب يوصل لموقعك، جهّز للاستلام.', icon: 'location_on' },
  { key: 'delivered', label: 'تم التوصيل', desc: 'تم توصيل طلبك. بتقدر تقيّم تجربتك.', icon: 'done_all' },
];

const STATUS_TO_STAGE = {
  new: 0, pending: 0, pending_payment: 0, payment_confirmed: 1,
  awaiting_restaurant_confirmation: 1, confirmed: 2, preparing: 3, preparation_delayed: 3,
  ready: 4, pickup_ready: 4, searching_for_courier: 4, courier_assigned: 5,
  courier_arriving_at_restaurant: 5, picked_up: 6, on_the_way: 7, arriving_soon: 8,
  delivered: 9, picked_up_by_customer: 9,
};
export function stageIndex(status) {
  if (!status) return 0;
  if (status in STATUS_TO_STAGE) return STATUS_TO_STAGE[status];
  return 0;
}
export function isTerminal(status) {
  return ['delivered', 'picked_up_by_customer', 'cancelled', 'rejected'].includes(status);
}
export function statusLabel(status) {
  const i = stageIndex(status);
  return STAGES[Math.min(i, STAGES.length - 1)].label;
}

export const PAYMENT_LABELS = {
  cash: 'الدفع نقدًا عند الاستلام',
  card_on_delivery: 'الدفع بالبطاقة عند الاستلام',
  card: 'بطاقة ائتمان أو فيزا',
  google_pay: 'Google Pay',
  paypal: 'PayPal',
};
export const PAYMENT_STATUS_LABELS = {
  pending: 'بانتظار تأكيد الدفع',
  authorization_pending: 'بانتظار حجز المبلغ',
  authorized: 'تم حجز المبلغ',
  paid: 'تم الدفع',
  cash_on_delivery_pending: 'الدفع عند الاستلام',
  failed: 'الدفع ما تم',
  cancelled: 'تم إلغاء الدفع',
  refund_pending: 'جاري إعادة المبلغ',
  refunded: 'تمت إعادة المبلغ',
  partially_refunded: 'إعادة جزئية للمبلغ',
};
export function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || PAYMENT_STATUS_LABELS.pending;
}
export const METHOD_LABELS = { delivery: 'توصيل', pickup: 'استلام ذاتي', dinein: 'جلوس بالمطعم' };

export function osmEmbed(lat, lng) {
  if (lat == null || lng == null) return null;
  const d = 0.008;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
}
export async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
    const j = await r.json();
    return j?.display_name || '';
  } catch { return ''; }
}