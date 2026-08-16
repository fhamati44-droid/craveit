// Frontend labels + formatters for the Admin Execution Center (Arabic-first RTL).

export const TABS = [
  { key: 'READY', label: 'جاهزة للتنفيذ', color: 'green' },
  { key: 'SCHEDULED', label: 'مجدولة', color: 'indigo' },
  { key: 'EXECUTED', label: 'شغالة الآن', color: 'green' },
  { key: 'PAUSED', label: 'موقوفة', color: 'amber' },
  { key: 'APPROVAL_REQUIRED', label: 'تحتاج موافقة', color: 'amber' },
  { key: 'COMPLETED', label: 'منتهية', color: 'gray' },
];

export const STATUS_AR = {
  DRAFT: 'مسودة', VALIDATING: 'قيد التحقق', READY: 'جاهزة', APPROVAL_REQUIRED: 'تتطلب موافقة',
  REJECTED: 'مرفوضة', SCHEDULED: 'مجدولة', EXECUTED: 'منفّذة', PAUSED: 'متوقفة',
  COMPLETED: 'مكتملة', CANCELLED: 'ملغاة',
};

export const HEALTH_AR = {
  HEALTHY: 'شغالة طبيعي', UNDERPERFORMING: 'الأداء أقل من المتوقع', CAPACITY_RISK: 'في ضغط تشغيلي',
  COMMERCIAL_RISK: 'في مخاطرة تجارية', SOLD_OUT: 'خلصت الكمية', EXPIRED: 'انتهى الوقت',
  PAUSED_OPERATIONAL: 'موقوفة بسبب التشغيل', NEEDS_REVIEW: 'تحتاج مراجعة', UNKNOWN: 'غير معروف',
};

export const LEARNING_AR = {
  STRONG: 'معلومة قابلة للاستخدام', MODERATE: 'أداء متوسط', WEAK: 'أداء ضعيف',
  INSUFFICIENT_DATA: 'بيانات غير كافية', CONFOUNDED: 'نتائج مشوشة بتداخل حملات',
  INTERRUPTED: 'الحملة تأثرت بضغط تشغيلي',
};

export const OBJECTIVE_AR = {
  DEMAND_RECOVERY: 'استعادة الطلب الفوري', CUSTOMER_ACQUISITION: 'زباين جدد',
  REACTIVATION: 'إعادة الزباين الغائبين', AOV_GROWTH: 'رفع متوسط السلة',
  SURPLUS: 'تفريغ فائض الكمية', LOYALTY: 'تفعيل النقاط والولاء',
  CONVERSION_RECOVERY: 'استرداد النية العالية', PRODUCT_STRENGTHENING: 'تقوية صنف معين',
  NEW_CUSTOMERS: 'زباين جدد', INCREASE_AOV: 'رفع متوسط السلة', IMMEDIATE_DEMAND: 'طلب فوري',
  LOYALTY_ENGAGEMENT: 'تفعيل النقاط والولاء', STRENGTHEN_ITEM: 'تقوية صنف',
  REPEAT_PURCHASE: 'تكرار الطلب', PAYDAY_AOV: 'يوم الراتب — رفع السلة', ACQUISITION: 'جذب زباين',
};

export const MECHANISM_AR = {
  NO_DISCOUNT: 'إبراز بدون خصم', VALUE_ADD: 'قيمة مضافة', MIX_VALUE: 'ميكس بقيمة مضافة',
  POINT_LOCKED: 'عرض بالنقاط', LIMITED_QUANTITY: 'كمية محدودة', FIRST_TRIAL: 'تجربة أولى',
  TIME_AND_QUANTITY: 'وقت وكمية', PERSONALIZED_VALUE: 'قيمة شخصية', PLUS_UPSELL: 'بلس — ترقية السلة',
  DIRECT_PRICE: 'خصم مباشر',
};

export const AUDIENCE_AR = {
  NEW_TO_RESTAURANT: 'ناس مهتمين ولسه ما جربوا', REPEAT_CUSTOMER: 'زباين راجعين',
  LAPSED_30: 'غائبون ٣٠ يوم', LAPSED_60: 'غائبون ٦٠ يوم', POINTS_ENGAGED: 'متفاعلون بالنقاط',
  HIGH_INTENT_NO_PURCHASE: 'نية عالية بدون شراء', public: 'الجميع', FAMILY: 'عائلات',
  HIGH_AOV: 'سلة عالية', PAYDAY_ACTIVE: 'نشطون يوم الراتب',
};

export const AUDIT_ACTION_AR = {
  decision_accepted: 'تم قبول القرار', opportunity_created: 'تم إنشاء الفرصة',
  plan_generated: 'تم توليد الخطة', validation_pass: 'اجتاز بوابة الأمان',
  validation_fail: 'فشل بوابة الأمان', campaign_scheduled: 'تمت جدولة الحملة',
  campaign_activated: 'تم تفعيل الحملة', quota_adjusted: 'تم تعديل الكمية',
  campaign_paused: 'تم إيقاف الحملة', campaign_resumed: 'تم استئناف الحملة',
  campaign_completed: 'تم إكمال الحملة', approval_requested: 'طلبت موافقة',
  manual_override: 'تدخل يدوي', kill_switch_triggered: 'تم تفعيل مفتاح الإيقاف',
  plan_rejected: 'تم رفض الخطة', plan_cancelled: 'تم إلغاء الخطة',
};

export const RESTAURANT_STATUS_AR = {
  open: 'جاهز', closed: 'مقفل', busy: 'مشغول', temporarily_unavailable: 'غير متاح مؤقتاً',
};

export const COLOR_CLS = {
  green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', soft: 'bg-green-50', border: 'border-green-200' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', soft: 'bg-amber-50', border: 'border-amber-200' },
  red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', soft: 'bg-red-50', border: 'border-red-200' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', soft: 'bg-gray-50', border: 'border-gray-200' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', soft: 'bg-indigo-50', border: 'border-indigo-200' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', soft: 'bg-blue-50', border: 'border-blue-200' },
};

export const HEALTH_COLOR = {
  HEALTHY: 'green', UNDERPERFORMING: 'amber', CAPACITY_RISK: 'red', COMMERCIAL_RISK: 'red',
  SOLD_OUT: 'gray', EXPIRED: 'gray', PAUSED_OPERATIONAL: 'amber', NEEDS_REVIEW: 'amber', UNKNOWN: 'gray',
};

export const STATUS_COLOR = {
  READY: 'green', SCHEDULED: 'indigo', EXECUTED: 'green', PAUSED: 'amber',
  APPROVAL_REQUIRED: 'amber', COMPLETED: 'gray', REJECTED: 'gray', CANCELLED: 'gray',
  DRAFT: 'gray', VALIDATING: 'gray',
};

export function fmtTime(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', weekday: 'short', day: 'numeric', month: 'short' }); } catch { return '—'; }
}
export function fmtHHMM(d) { if (!d) return '—'; try { return new Date(d).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' }); } catch { return '—'; } }
export function fmtWin(s, e) { return `${fmtHHMM(s)} — ${fmtHHMM(e)}`; }
export function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return '—'; } }
export function fmtDuration(ms) {
  if (ms == null || ms < 0) return '—';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} دقيقة`;
  const h = Math.floor(min / 60); const m = min % 60;
  return m ? `${h} ساعة و${m} دقيقة` : `${h} ساعة`;
}
export function money(n) { return n == null ? '—' : `${Math.round((Number(n) || 0) * 100) / 100} ₪`; }
export function num(n) { return n == null ? '—' : (typeof n === 'number' ? Math.round(n * 100) / 100 : n); }
export function pct(n) { return n == null ? '—' : `${Math.round((Number(n) || 0) * 100)}%`; }