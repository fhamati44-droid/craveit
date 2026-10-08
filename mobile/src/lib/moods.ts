import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { Mood } from "./types";

type IconName = keyof typeof MaterialIcons.glyphMap;
// Same mapping as the web app (src/lib/moodIcons.js), in vector-icons naming.
const MOOD_ICON: Record<string, IconName> = {
  "مطبخ البيت مسكّر": "no-meals",
  "مطبخ البيت مسكر": "no-meals",
  "الحبايب عنا": "group",
  "البيت بده": "shopping-cart",
  "آخر الليل": "bedtime",
  "لمة شباب": "sports-soccer",
  "قعدة صبايا": "spa",
  "وقت المباراة": "sports-soccer",
  طاقة: "bolt",
  "أول النهار": "wb-sunny",
  "ضيوف بالطريق": "door-front",
  "ناقصنا كم شغلة": "restaurant",
  "جوع آخر النهار": "soup-kitchen",
  "حلو بعد الأكل": "cake",
};
export function moodIcon(mood: Mood): IconName {
  const fromCms = mood.icon?.replace(/_/g, "-");
  if (fromCms && fromCms in MaterialIcons.glyphMap) return fromCms as IconName;
  return MOOD_ICON[mood.name_ar || ""] || "auto-awesome";
}
