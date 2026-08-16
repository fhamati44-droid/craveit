// Frontend labels mirroring base44/shared/partnerDemoView.ts for demo UI.
export const TRAFFIC_DOT = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴' };
export const TRAFFIC_LABEL_AR = {
  GREEN: 'TAMAM تقدر تقوّي',
  YELLOW: 'نشتغل بحذر',
  RED: 'ما نجيب طلبات زيادة',
};
export const OFFER_TYPE_AR = {
  STANDARD_VALUE: 'عرض قيمة', VALUE_ADD: 'قيمة مضافة', FIRST_TRIAL: 'تجربة أولى',
  REACTIVATION: 'إعادة زبون', LIMITED_TIME: 'عرض محدود الوقت', LIMITED_QUANTITY: 'كمية محدودة',
  TIME_AND_QUANTITY: 'عرض وقت وكمية', POINT_LOCKED: 'عرض حصري بالنقاط', AOV_UPSELL: 'ترقية السلة',
  SURPLUS: 'فائض الكمية', RAW_MATERIAL_OPPORTUNITY: 'فرصة المادة الخام',
};
export const STATUS_AR = {
  active: 'شغّالة', scheduled: 'جاية', paused: 'متوقفة', ended: 'منتهية', sold_out: 'خلصت', completed: 'مكتملة',
};
export const DAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function fmtTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}
export function fmtRange(start, end) {
  const s = fmtTime(start), e = fmtTime(end);
  if (s && e) return `${s} ← ${e}`;
  return s || e || '';
}
export function fmtRemaining(ms) {
  if (ms <= 0) return 'انتهى';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs} ساعة ${rem} دقيقة` : `${hrs} ساعة`;
}
export function fmtDayTime(iso) {
  try { const d = new Date(iso); return `${DAY_AR[d.getDay()]} ${d.toLocaleString('ar', { hour: '2-digit', minute: '2-digit' })}`; } catch { return ''; }
}