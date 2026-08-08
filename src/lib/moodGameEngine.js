/**
 * Mood Game Engine — pure game logic (no React).
 * Score, combo, mood, transformations, zone mapping.
 * Game points are NOT real currency. Real prices come from meal.price.
 */

export const ZONES = [
  { key: 'main', label: 'الأساسي', icon: '🍽️', angle: 0, color: '#89DB78' },
  { key: 'side', label: 'إضافات', icon: '🍟', angle: 90, color: '#A2F790' },
  { key: 'drink', label: 'مشروب', icon: '🥤', angle: 180, color: '#87DB68' },
  { key: 'dessert', label: 'حلى', icon: '🍰', angle: 270, color: '#EAC45C' },
];

export const MAX_MEALS = 6;
export const MIN_MEALS = 1;

const DESSERT_KEYS = ['حلويات', 'كيك', 'كنافة', 'آيس كريم', 'بوظة', 'شوكولاتة', 'تسالي', 'حلى', 'dessert', 'كناف', 'مهلبية', 'قطايف'];
const DRINK_KEYS = ['مشروبات', 'عصائر', 'مشروب', 'قهوة', 'شاي', 'بيبسي', 'كولا', 'water', 'drink', 'مي', 'عصير', 'ليموناضة'];
const SALAD_KEYS = ['سلطات', 'سلطة', 'salad', 'فتوش', 'تبولة'];
const SIDE_KEYS = ['إضافات', 'مقبلات', 'بطاطا', 'صلصات', 'خفيف', 'side', 'snack', 'حمص', 'متبل'];

export function categoryToZone(category) {
  const c = (category || '').toLowerCase();
  if (DESSERT_KEYS.some((k) => c.includes(k))) return 'dessert';
  if (DRINK_KEYS.some((k) => c.includes(k))) return 'drink';
  if (SALAD_KEYS.some((k) => c.includes(k))) return 'side';
  if (SIDE_KEYS.some((k) => c.includes(k))) return 'side';
  return 'main';
}

export function calculateScore(placedMeals) {
  let score = 0;
  const zoneSet = new Set();
  placedMeals.forEach((m) => {
    score += 25;
    if (m.zone === categoryToZone(m.category)) score += 15;
    zoneSet.add(m.zone);
  });
  if (zoneSet.size >= 3) score += 50;
  if (zoneSet.size >= 4) score += 100;
  return score;
}

export function calculateCombo(placedMeals) {
  return new Set(placedMeals.map((m) => m.zone)).size;
}

export function calculateProgress(placedMeals, max = MAX_MEALS) {
  return Math.min(100, Math.round((placedMeals.length / max) * 100));
}

const MOOD_LEVELS = [
  { level: 0, label: 'بادي', emoji: '😐', color: '#C0CAB8' },
  { level: 1, label: 'كويس', emoji: '🙂', color: '#C0CAB8' },
  { level: 2, label: 'حلو', emoji: '😊', color: '#89DB78' },
  { level: 3, label: 'رائع!', emoji: '😍', color: '#A2F790' },
  { level: 4, label: 'ممتاز!', emoji: '🤩', color: '#EAC45C' },
];

export function calculateMood(placedMeals) {
  const count = placedMeals.length;
  const variety = new Set(placedMeals.map((m) => m.zone)).size;
  if (count === 0) return MOOD_LEVELS[0];
  if (count >= 5 && variety >= 3) return MOOD_LEVELS[4];
  if (count >= 3 && variety >= 2) return MOOD_LEVELS[3];
  if (count >= 2) return MOOD_LEVELS[2];
  return MOOD_LEVELS[1];
}

export function getTransformation(placedMeals) {
  const count = placedMeals.length;
  const variety = new Set(placedMeals.map((m) => m.zone)).size;
  const mainCount = placedMeals.filter((m) => m.zone === 'main').length;
  if (count === 0) return { name: 'empty', label: '', tableScale: 0.75, showZones: 0, glow: 'none' };
  if (count >= 5 && variety >= 3 && mainCount >= 1) return { name: 'plus', label: 'بلس', tableScale: 1.0, showZones: 4, glow: 'gold' };
  if (count >= 2 && variety >= 2) return { name: 'mix', label: 'ميكس', tableScale: 0.88, showZones: 3, glow: 'green' };
  return { name: 'classic', label: 'كلاسيك', tableScale: 0.78, showZones: 1, glow: 'soft' };
}

export function getStageNumber(placedMeals) {
  return Math.min(20, 1 + placedMeals.length * 2);
}

export function canCompleteMood(placedMeals) {
  return placedMeals.length >= MIN_MEALS && placedMeals.length <= MAX_MEALS;
}

export function isMoodFull(placedMeals) {
  return placedMeals.length >= MAX_MEALS;
}

export function getTotalPrice(placedMeals) {
  return placedMeals.reduce((s, m) => s + (m.price || 0) * (m.quantity || 1), 0);
}

export function getRestaurantNames(placedMeals) {
  const names = new Set(placedMeals.map((m) => m.restaurant_name).filter(Boolean));
  return Array.from(names);
}