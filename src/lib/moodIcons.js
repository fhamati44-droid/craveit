const MOOD_ICON = {
  'مطبخ البيت مسكّر': 'no_meals',
  'الحبايب عنا': 'group',
  'البيت بده': 'shopping_cart',
  'آخر الليل': 'bedtime',
  'لمة شباب': 'sports_soccer',
  'قعدة صبايا': 'spa',
  'وقت المباراة': 'sports_soccer',
  'طاقة': 'bolt',
  'أول النهار': 'wb_sunny',
  'ضيوف بالطريق': 'door_front',
  'ناقصنا كم شغلة': 'restaurant',
  'جوع آخر النهار': 'soup_kitchen',
  'حلو بعد الأكل': 'cake',
};
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
export function moodIconFor(m) {
  if (m?.icon && !EMOJI.test(m.icon)) return m.icon;
  return MOOD_ICON[m?.name_ar] || 'auto_awesome';
}