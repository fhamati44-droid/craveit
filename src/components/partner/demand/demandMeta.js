// Shared metadata + helpers for the weekly demand planner (خفايا الحركة).
// Green/yellow/red/grey meaning applies inside the planner only.

export const LEVELS = {
  quiet: { key: 'quiet', label: 'هادئ', sub: 'فرصة لتقوية البيع', icon: 'trending_down', bg: 'bg-tamam-green/15', text: 'text-tamam-green-bright', dot: 'bg-tamam-green-bright', border: 'border-tamam-green/45', chip: 'bg-tamam-green/20 text-tamam-green-bright' },
  medium: { key: 'medium', label: 'متوسط', sub: 'الحركة مش ثابتة', icon: 'trending_flat', bg: 'bg-tamam-gold/15', text: 'text-tamam-gold', dot: 'bg-tamam-gold', border: 'border-tamam-gold/45', chip: 'bg-tamam-gold/20 text-tamam-gold' },
  busy: { key: 'busy', label: 'ضغط', sub: 'ما نزيد حملات', icon: 'trending_up', bg: 'bg-tamam-error/15', text: 'text-tamam-error', dot: 'bg-tamam-error', border: 'border-tamam-error/45', chip: 'bg-tamam-error/20 text-tamam-error' },
  unknown: { key: 'unknown', label: 'مش محدد', sub: 'لسه ما تصنّف', icon: 'help', bg: 'bg-tamam-surface-high', text: 'text-tamam-text-muted', dot: 'bg-tamam-text-muted', border: 'border-tamam-outline/40', chip: 'bg-tamam-surface-high text-tamam-text-muted' },
};

export const LEVEL_ORDER = ['quiet', 'medium', 'busy', 'unknown'];

export const SOURCE_LABEL = {
  merchant: 'حددته أنت',
  restaurant_manager: 'حدده مدير المطعم',
  tamam_admin: 'عدّله الأدمين',
  analytics_suggestion: 'اقتراح تمام',
  analytics: 'مستنتج من بيانات الطلبات',
  system: 'نظامي',
};

export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const levelMeta = (level) => LEVELS[level] || LEVELS.unknown;

export function toMin(t) {
  if (!t || typeof t !== 'string' || !t.includes(':')) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
export function fmtHM(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
export function endOf(start, step = 60) {
  const s = toMin(start);
  if (s == null) return start;
  return fmtHM(s + step);
}
export function buildBlocks(open, close, step = 60, all24 = false) {
  const startMin = all24 ? 0 : (toMin(open) ?? 0);
  const endMin = all24 ? 1440 : (toMin(close) ?? 1440);
  const blocks = [];
  for (let s = startMin; s + step <= endMin; s += step) blocks.push({ start: fmtHM(s), end: fmtHM(s + step), startMin: s });
  return blocks;
}
export const PERIODS = [
  { key: 'morning', label: 'كل الصبح', from: 10, to: 12 },
  { key: 'lunch', label: 'وقت الغدا', from: 12, to: 15 },
  { key: 'afternoon', label: 'بعد الظهر', from: 15, to: 18 },
  { key: 'evening', label: 'المساء', from: 18, to: 22 },
];
export function accessibleName(dayName, start, end, level) {
  const m = levelMeta(level);
  return `${dayName}، من ${start} إلى ${end}، ${m.label}، ${m.sub}`;
}