import { useCallback, useMemo } from "react";
import type Ionicons from "@expo/vector-icons/Ionicons";
import { useStore, type Lang } from "./state";

/** Arabic is the default; Hebrew is RTL too; English mirrors the layout to LTR. */
export type { Lang };
export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: "ar", label: "ع", name: "العربية" },
  { code: "he", label: "עב", name: "עברית" },
  { code: "en", label: "EN", name: "English" },
];
export const isLang = (v: unknown): v is Lang => v === "ar" || v === "he" || v === "en";

type Entry = Record<Lang, string>;
const d = <T extends Record<string, Entry>>(x: T) => x;

const dict = d({
  // errors from the data layer
  errNoKey: { ar: "ناقص مفتاح Supabase (EXPO_PUBLIC_SUPABASE_ANON_KEY)", he: "חסר מפתח Supabase (EXPO_PUBLIC_SUPABASE_ANON_KEY)", en: "Missing Supabase key (EXPO_PUBLIC_SUPABASE_ANON_KEY)" },
  errServer: { ar: "تعذر الاتصال بالخادم", he: "בעיה בחיבור לשרת", en: "Couldn't reach the server" },
  errOffline: { ar: "ما في اتصال بالإنترنت، أو الخادم مش متاح هسا.", he: "אין חיבור לאינטרנט, או שהשרת לא זמין כרגע.", en: "No internet connection, or the server is unavailable." },
  errNotFound: { ar: "مش موجود.", he: "לא נמצא.", en: "Not found." },

  // navigation
  tabHome: { ar: "الرئيسية", he: "בית", en: "Home" },
  tabExplore: { ar: "استكشف", he: "גלו", en: "Explore" },
  tabOrders: { ar: "طلباتي", he: "ההזמנות שלי", en: "My orders" },
  tabProfile: { ar: "حسابي", he: "החשבון שלי", en: "Account" },
  tamamGame: { ar: "TAMAM، لعبة المود", he: "TAMAM, משחק המצב רוח", en: "TAMAM mood game" },
  screenRestaurant: { ar: "المطعم", he: "המסעדה", en: "Restaurant" },
  screenCart: { ar: "السلة", he: "הסל", en: "Cart" },
  screenCheckout: { ar: "تأكيد الطلب", he: "אישור ההזמנה", en: "Checkout" },
  screenTracking: { ar: "تتبّع الطلب", he: "מעקב הזמנה", en: "Order tracking" },
  screenSuggestions: { ar: "اقتراحات TAMAM", he: "ההצעות של TAMAM", en: "TAMAM picks" },
  screenSuggestion: { ar: "اقتراح TAMAM", he: "הצעה של TAMAM", en: "TAMAM pick" },
  homeA11y: { ar: "TAMAM الرئيسية", he: "TAMAM דף הבית", en: "TAMAM home" },
  search: { ar: "بحث", he: "חיפוש", en: "Search" },
  cartCount: { ar: "السلة {n}", he: "הסל {n}", en: "Cart {n}" },
  language: { ar: "اللغة", he: "שפה", en: "Language" },

  // shared
  retry: { ar: "حاول مرة ثانية", he: "לנסות שוב", en: "Try again" },
  viewAll: { ar: "عرض الكل", he: "הכול", en: "See all" },
  total: { ar: "المجموع", he: "סה\"כ", en: "Total" },
  delivery: { ar: "توصيل", he: "משלוח", en: "Delivery" },
  free: { ar: "مجاني", he: "חינם", en: "Free" },
  close: { ar: "إغلاق", he: "סגירה", en: "Close" },
  playTamam: { ar: "العب TAMAM", he: "לשחק TAMAM", en: "Play TAMAM" },
  browseRestaurants: { ar: "تصفّح المطاعم", he: "לעיון במסעדות", en: "Browse restaurants" },
  backHome: { ar: "رجوع للرئيسية", he: "חזרה לדף הבית", en: "Back to home" },
  mealImage: { ar: "صورة الوجبة", he: "תמונת המנה", en: "Meal photo" },
  image: { ar: "صورة", he: "תמונה", en: "Photo" },
  loadFailed: { ar: "تعذر تحميل البيانات", he: "לא הצלחנו לטעון", en: "Couldn't load" },
  pkgClassic: { ar: "كلاسيك", he: "קלאסיק", en: "Classic" },
  pkgMix: { ar: "ميكس", he: "מיקס", en: "Mix" },
  pkgPlus: { ar: "بلس", he: "פלוס", en: "Plus" },
  all: { ar: "الكل", he: "הכול", en: "All" },
  open: { ar: "مفتوح", he: "פתוח", en: "Open" },
  closed: { ar: "مسكّر", he: "סגור", en: "Closed" },
  minutesShort: { ar: "{n} د", he: "{n} דק'", en: "{n} min" },
  deliveryFee: { ar: "توصيل {p}", he: "משלוח {p}", en: "Delivery {p}" },
  minOrder: { ar: "حد أدنى {p}", he: "מינימום {p}", en: "Min. {p}" },
  meals: { ar: "{n} وجبات", he: "{n} מנות", en: "{n} items" },
  whatsappUs: { ar: "احكي معنا بالواتساب", he: "דברו איתנו בוואטסאפ", en: "Chat with us on WhatsApp" },

  // home
  homeEyebrow: { ar: "TAMAM · حسب مودك", he: "TAMAM · לפי מצב הרוח", en: "TAMAM · for your mood" },
  homeTitle: { ar: "شو عبالك تاكل اليوم؟", he: "מה בא לך לאכול היום?", en: "What are you craving today?" },
  homeSub: { ar: "لفّ العجلة، و TAMAM بتختارلك الوجبة.", he: "סובבו את הגלגל ו-TAMAM תבחר לכם ארוחה.", en: "Spin the wheel and TAMAM picks your meal." },
  go: { ar: "انطلق", he: "יאללה", en: "Spin" },
  moodQuestion: { ar: "شو مودك هسا؟", he: "מה מצב הרוח עכשיו?", en: "What's your mood?" },
  picksForYou: { ar: "اختيارات TAMAM إلك", he: "הבחירות של TAMAM בשבילך", en: "TAMAM picks for you" },
  byMoodTime: { ar: "حسب مودك والوقت", he: "לפי מצב הרוח והשעה", en: "By mood and time of day" },
  noSuggestions: { ar: "ما في اقتراحات منشورة حالياً.", he: "אין הצעות כרגע.", en: "No picks right now." },
  undecided: { ar: "محتار؟ خلّيها علينا", he: "מתלבטים? עלינו", en: "Can't decide? Leave it to us" },
  oneTap: { ar: "دوسة وحدة، والعجلة بتختارلك.", he: "לחיצה אחת, והגלגל בוחר בשבילך.", en: "One tap and the wheel picks for you." },
  nearby: { ar: "مطاعم قريبة منك", he: "מסעדות קרובות", en: "Restaurants near you" },
  trust: { ar: "مطاعم محلية · اختيارات حسب مودك", he: "מסעדות מקומיות · בחירות לפי מצב רוח", en: "Local restaurants · picks for your mood" },

  // game
  gameTag: { ar: "لفّ العجلة · TAMAM بتختارلك الوجبة", he: "סובבו את הגלגל · TAMAM בוחרת לכם", en: "Spin the wheel · TAMAM picks your meal" },
  loadingMoods: { ar: "عم نجهّز المودات...", he: "מכינים את מצבי הרוח...", en: "Getting moods ready..." },
  moodsFailed: { ar: "ما قدرنا نحمّل المودات.", he: "לא הצלחנו לטעון את מצבי הרוח.", en: "Couldn't load the moods." },
  noMoods: { ar: "ما في مودات جاهزة هسا.", he: "אין מצבי רוח זמינים כרגע.", en: "No moods available right now." },
  tapMood: { ar: "دوس على مود، أو خلّيها علينا", he: "בחרו מצב רוח, או תשאירו לנו", en: "Tap a mood, or leave it to us" },
  allMoods: { ar: "كل المودات ({n})", he: "כל מצבי הרוח ({n})", en: "All moods ({n})" },
  yourMood: { ar: "طلع مودك", he: "יצא לך", en: "Your mood" },
  pickingMeal: { ar: "عم نختارلك وجبة...", he: "בוחרים לך ארוחה...", en: "Picking a meal for you..." },
  mealsFailed: { ar: "ما قدرنا نجيب الوجبات هسا.", he: "לא הצלחנו להביא ארוחות כרגע.", en: "Couldn't load meals right now." },
  noMealsMood: { ar: "لسا ما في وجبات جاهزة لهالمود.", he: "עדיין אין ארוחות למצב הרוח הזה.", en: "No meals for this mood yet." },
  wantThis: { ar: "بدّي هاي!", he: "את זה אני רוצה!", en: "I want this!" },
  spinAgain: { ar: "لفّ كمان مرة", he: "לסובב שוב", en: "Spin again" },
  allMeals: { ar: "كل الوجبات", he: "כל הארוחות", en: "All meals" },
  allMealsN: { ar: "كل الوجبات ({n})", he: "כל הארוחות ({n})", en: "All meals ({n})" },
  pickMood: { ar: "اختار مود {name}", he: "לבחור {name}", en: "Pick {name}" },
  spinA11y: { ar: "انطلق، خلّي TAMAM تختار", he: "יאללה, ש-TAMAM תבחר", en: "Spin, let TAMAM choose" },
  tapHere: { ar: "اضغط هنا", he: "לחצו כאן", en: "Tap here" },

  // restaurants & menu
  craving: { ar: "شو عبالك اليوم؟", he: "מה בא לך היום?", en: "What do you feel like?" },
  searchPlaceholder: { ar: "فتّش عن مطعم أو أكلة", he: "חפשו מסעדה או מנה", en: "Search a restaurant or dish" },
  searchRestaurants: { ar: "بحث المطاعم", he: "חיפוש מסעדות", en: "Search restaurants" },
  allRestaurants: { ar: "كل المطاعم", he: "כל המסעדות", en: "All restaurants" },
  openNow: { ar: "مفتوح هسا", he: "פתוח עכשיו", en: "Open now" },
  noRestaurants: { ar: "ما لقينا مطاعم مناسبة.", he: "לא מצאנו מסעדות מתאימות.", en: "No matching restaurants." },
  restaurantClosed: { ar: "المطعم مغلق حالياً", he: "המסעדה סגורה כרגע", en: "This restaurant is closed now" },
  searchMenu: { ar: "فتّش بالقائمة", he: "חיפוש בתפריט", en: "Search the menu" },
  unavailable: { ar: "· غير متوفر", he: "· לא זמין", en: "· unavailable" },
  menuUnpublished: { ar: "القائمة غير منشورة حالياً.", he: "התפריט לא פורסם עדיין.", en: "Menu not published yet." },
  viewCartN: { ar: "شوف السلة · {n} وجبات", he: "לסל · {n} מנות", en: "View cart · {n} items" },
  chooseFirst: { ar: "اختار {name} قبل الإضافة.", he: "יש לבחור {name} לפני ההוספה.", en: "Choose {name} first." },
  required: { ar: "· مطلوب", he: "· חובה", en: "· required" },
  upTo: { ar: "حتى {n} خيارات", he: "עד {n} אפשרויות", en: "Up to {n} options" },
  mealNotePh: { ar: "مثلاً: بدون بصل، صوص زيادة…", he: "למשל: בלי בצל, עוד רוטב…", en: "e.g. no onions, extra sauce…" },
  mealNote: { ar: "ملاحظات الوجبة", he: "הערות למנה", en: "Notes for this item" },
  addToCart: { ar: "إضافة للسلة · {p}", he: "הוספה לסל · {p}", en: "Add to cart · {p}" },

  // packages
  suggestionsTitle: { ar: "اقتراحات TAMAM", he: "ההצעות של TAMAM", en: "TAMAM picks" },
  noMoodSuggestions: { ar: "ما في اقتراحات منشورة لهالمود.", he: "אין הצעות למצב הרוח הזה.", en: "No picks for this mood." },
  inPackage: { ar: "شو في بالباقة", he: "מה יש בחבילה", en: "What's inside" },
  addPackage: { ar: "ضيف الباقة للسلة", he: "להוסיף את החבילה לסל", en: "Add package to cart" },
  pickFromMenu: { ar: "اختار الوجبات من قائمة المطعم:", he: "בחרו מנות מהתפריט של המסעדה:", en: "Choose items from the restaurant menu:" },
  changeAt: { ar: "غيّر بالطلب من {name}", he: "לשנות בהזמנה מ{name}", en: "Customize at {name}" },
  seeMenu: { ar: "شوف قائمة المطعم", he: "לתפריט המסעדה", en: "See the menu" },
  editInCart: { ar: "بتقدر تعدّل الكميات من السلة قبل ما تطلب.", he: "אפשר לשנות כמויות בסל לפני ההזמנה.", en: "You can change quantities in the cart before ordering." },

  // cart & checkout
  cartEmpty: { ar: "سلتك فاضية", he: "הסל ריק", en: "Your cart is empty" },
  cartEmptySub: { ar: "محتار شو تطلب؟ خلّي TAMAM تختارلك.", he: "לא יודעים מה להזמין? ש-TAMAM תבחר.", en: "Not sure what to order? Let TAMAM choose." },
  yourCart: { ar: "سلتك", he: "הסל שלך", en: "Your cart" },
  increase: { ar: "زيادة", he: "הוספה", en: "Increase" },
  decrease: { ar: "تنقيص", he: "הפחתה", en: "Decrease" },
  remove: { ar: "حذف", he: "מחיקה", en: "Remove" },
  multiRestaurant: { ar: "طلبك من {n} مطاعم، كل مطعم بيوصل لحاله ومع رسوم توصيله.", he: "ההזמנה מ-{n} מסעדות. כל אחת מגיעה בנפרד עם דמי משלוח משלה.", en: "Your order is from {n} restaurants; each delivers separately with its own fee." },
  itemsSubtotal: { ar: "مجموع الوجبات", he: "סכום המנות", en: "Items subtotal" },
  toCheckout: { ar: "كمّل للدفع", he: "להמשך תשלום", en: "Go to checkout" },
  payCash: { ar: "كاش عند الاستلام", he: "מזומן במסירה", en: "Cash on delivery" },
  payCashHint: { ar: "بتدفع لما يوصل الأكل", he: "משלמים כשהאוכל מגיע", en: "Pay when the food arrives" },
  payCard: { ar: "بطاقة عند الباب", he: "אשראי בדלת", en: "Card at the door" },
  payCardHint: { ar: "الشوفير معه جهاز", he: "לשליח יש מסופון", en: "The driver has a card reader" },
  payWa: { ar: "اطلب عبر واتساب", he: "הזמנה בוואטסאפ", en: "Order on WhatsApp" },
  payWaHint: { ar: "منأكّد معك بالواتساب", he: "נאשר איתך בוואטסאפ", en: "We confirm with you on WhatsApp" },
  howToReceive: { ar: "طريقة الاستلام", he: "איך מקבלים", en: "How do you want it?" },
  pickup: { ar: "استلام من المطعم", he: "איסוף מהמסעדה", en: "Pickup" },
  yourDetails: { ar: "تفاصيلك", he: "הפרטים שלך", en: "Your details" },
  name: { ar: "الاسم", he: "שם", en: "Name" },
  phone: { ar: "رقم الهاتف", he: "טלפון", en: "Phone" },
  addressPh: { ar: "العنوان: الحي، الشارع، رقم البيت", he: "כתובת: שכונה, רחוב, מספר בית", en: "Address: area, street, house no." },
  deliveryAddress: { ar: "عنوان التوصيل", he: "כתובת למשלוח", en: "Delivery address" },
  notesPh: { ar: "ملاحظات للمطعم أو الشوفير (اختياري)", he: "הערות למסעדה או לשליח (לא חובה)", en: "Notes for the restaurant or driver (optional)" },
  payment: { ar: "الدفع", he: "תשלום", en: "Payment" },
  summary: { ar: "ملخص", he: "סיכום", en: "Summary" },
  sending: { ar: "عم نبعت الطلب...", he: "שולחים את ההזמנה...", en: "Sending your order..." },
  continueWa: { ar: "كمّل بالواتساب", he: "להמשיך בוואטסאפ", en: "Continue on WhatsApp" },
  orderNow: { ar: "اطلب هسا · {p}", he: "להזמין עכשיו · {p}", en: "Order now · {p}" },
  sendFailed: { ar: "ما قدرنا نبعت الطلب: {e}. جرّب كمان مرة أو اطلب عبر واتساب.", he: "לא הצלחנו לשלוח את ההזמנה: {e}. נסו שוב או הזמינו בוואטסאפ.", en: "We couldn't send your order: {e}. Try again or order on WhatsApp." },
  errName: { ar: "الاسم مطلوب", he: "חסר שם", en: "Name is required" },
  errPhone: { ar: "رقم الهاتف مش صحيح", he: "מספר הטלפון לא תקין", en: "Phone number looks wrong" },
  errAddress: { ar: "العنوان مطلوب للتوصيل", he: "צריך כתובת למשלוח", en: "Address is required for delivery" },
  waNewOrder: { ar: "طلب جديد من {name}", he: "הזמנה חדשה מ{name}", en: "New order from {name}" },
  waPhone: { ar: "هاتف: {v}", he: "טלפון: {v}", en: "Phone: {v}" },
  waAddress: { ar: "عنوان: {v}", he: "כתובת: {v}", en: "Address: {v}" },
  waPickup: { ar: "استلام ذاتي", he: "איסוף עצמי", en: "Pickup" },
  waNotes: { ar: "ملاحظات: {v}", he: "הערות: {v}", en: "Notes: {v}" },
  waTotal: { ar: "المجموع: {v}", he: "סה\"כ: {v}", en: "Total: {v}" },

  // tracking & orders
  st_new: { ar: "وصل الطلب", he: "ההזמנה התקבלה", en: "Order received" },
  st_confirmed: { ar: "المطعم أكّد", he: "המסעדה אישרה", en: "Restaurant confirmed" },
  st_cooking: { ar: "عم ينطبخ", he: "בהכנה", en: "Being prepared" },
  st_ready: { ar: "جاهز، الشوفير بالطريق", he: "מוכן, השליח בדרך", en: "Ready, driver on the way" },
  st_delivered: { ar: "وصل! صحتين", he: "הגיע! בתיאבון", en: "Delivered! Enjoy" },
  st_cancelled: { ar: "انلغى الطلب", he: "ההזמנה בוטלה", en: "Order cancelled" },
  orderNotFound: { ar: "ما لقينا الطلب", he: "לא מצאנו את ההזמנה", en: "Order not found" },
  orderNo: { ar: "طلب رقم #{id}", he: "הזמנה מס' {id}", en: "Order #{id}" },
  orderSplit: { ar: "طلبك انقسم على {n} مطاعم، كل واحد بيوصل لحاله. بتلاقيهم كلهم بـ«طلباتي».", he: "ההזמנה התחלקה ל-{n} מסעדות, וכל אחת מגיעה בנפרד. כולן מופיעות ב«ההזמנות שלי».", en: "Your order was split across {n} restaurants; each arrives separately. Find them all in “My orders”." },
  autoUpdate: { ar: "الحالة بتتحدث لحالها.", he: "הסטטוס מתעדכן לבד.", en: "Status updates automatically." },
  orderDetails: { ar: "تفاصيل الطلب", he: "פרטי ההזמנה", en: "Order details" },
  problem: { ar: "في مشكلة؟ احكي معنا بالواتساب", he: "יש בעיה? דברו איתנו בוואטסאפ", en: "Problem? Chat with us on WhatsApp" },
  waAboutOrder: { ar: "مرحبا، بخصوص طلب رقم #{id}", he: "שלום, לגבי הזמנה מס' {id}", en: "Hi, about order #{id}" },
  noOrdersYet: { ar: "لسا ما في طلبات", he: "עדיין אין הזמנות", en: "No orders yet" },
  noOrdersSub: { ar: "أول طلب إلك رح يبيّن هون. محتار شو تطلب؟ خلّي TAMAM تختارلك.", he: "ההזמנה הראשונה שלך תופיע כאן. מתלבטים? ש-TAMAM תבחר.", en: "Your first order will show up here. Can't decide? Let TAMAM choose." },
  continueCart: { ar: "كمّل سلتك · {n}", he: "להמשיך לסל · {n}", en: "Continue your cart · {n}" },
  orderFallback: { ar: "طلب #{id}", he: "הזמנה #{id}", en: "Order #{id}" },
  noOrdersFound: { ar: "ما لقينا طلبات.", he: "לא נמצאו הזמנות.", en: "No orders found." },

  // profile
  welcome: { ar: "أهلا فيك", he: "ברוכים הבאים", en: "Welcome" },
  profileHint: { ar: "تفاصيلك بتنحفظ عندك وبتعبّي حالها بالطلب الجاي.", he: "הפרטים נשמרים אצלך וימולאו לבד בהזמנה הבאה.", en: "Saved on this device and filled in on your next order." },
  saved: { ar: "انحفظ ✓", he: "נשמר ✓", en: "Saved ✓" },
  save: { ar: "احفظ", he: "שמירה", en: "Save" },
  tagline: { ar: "أكل بيتي ومطاعم محلية · حسب مودك", he: "אוכל ביתי ומסעדות מקומיות · לפי מצב הרוח", en: "Home cooking & local restaurants · for your mood" },
});
export type Key = keyof typeof dict;

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  let text = dict[key]?.[lang] ?? dict[key]?.ar ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

// Built-in names for the known moods until name_he / name_en are filled in Supabase.
const MOOD_NAMES: Record<string, { he: string; en: string }> = {
  "مطبخ البيت مسكّر": { he: "המטבח בבית סגור", en: "Kitchen's closed" },
  "مطبخ البيت مسكر": { he: "המטבח בבית סגור", en: "Kitchen's closed" },
  "البيت بده": { he: "מצטיידים לבית", en: "Stock up the house" },
  "الحبايب عنا": { he: "החברים אצלנו", en: "Friends are over" },
  "آخر الليل": { he: "מאוחר בלילה", en: "Late night" },
  "أول النهار": { he: "בוקר", en: "Morning" },
  طاقة: { he: "אנרגיה", en: "Energy" },
  "قعدة صبايا": { he: "ערב בנות", en: "Girls' night" },
  "لمة شباب": { he: "ערב חבר'ה", en: "Hangout with the guys" },
  "وقت المباراة": { he: "זמן משחק", en: "Game time" },
  "ضيوف بالطريق": { he: "אורחים בדרך", en: "Guests on the way" },
  "ناقصنا كم شغلة": { he: "חסרים כמה דברים", en: "Need a few things" },
  "جوع آخر النهار": { he: "רעב של סוף היום", en: "End-of-day hunger" },
  "حلو بعد الأكل": { he: "קינוח", en: "Dessert time" },
};

type Named = {
  name?: string | null;
  name_ar?: string | null;
  name_he?: string | null;
  name_en?: string | null;
  title?: string | null;
  title_ar?: string | null;
  title_he?: string | null;
  title_en?: string | null;
};
/**
 * Name in the chosen language. In this database `name` is Hebrew (it's what
 * the kitchen reads) and `name_ar` is Arabic; `*_he` / `*_en` override.
 */
export function localName(lang: Lang, x: Named) {
  const ar = x.name_ar || x.title_ar;
  const base = x.name || x.title;
  if (lang === "ar") return ar || base || "";
  const own = lang === "he" ? x.name_he || x.title_he : x.name_en || x.title_en;
  const mood = ar ? MOOD_NAMES[ar]?.[lang] : undefined;
  return own || mood || (lang === "he" ? base || ar : base || ar) || "";
}
export function localDescription(
  lang: Lang,
  x: { description?: string | null; description_ar?: string | null; description_he?: string | null; description_en?: string | null },
) {
  if (lang === "ar") return x.description_ar || x.description || "";
  const own = lang === "he" ? x.description_he : x.description_en;
  return own || x.description || x.description_ar || "";
}

// ---- layout direction -------------------------------------------------------
// Styles in this app are written right-to-left. For English we mirror them:
// row-reverse ↔ row, right ↔ left (text, positions, margins, paddings, radii).
const SWAP: Record<string, string> = {
  left: "right",
  right: "left",
  marginLeft: "marginRight",
  marginRight: "marginLeft",
  paddingLeft: "paddingRight",
  paddingRight: "paddingLeft",
  borderLeftWidth: "borderRightWidth",
  borderRightWidth: "borderLeftWidth",
  borderTopLeftRadius: "borderTopRightRadius",
  borderTopRightRadius: "borderTopLeftRadius",
  borderBottomLeftRadius: "borderBottomRightRadius",
  borderBottomRightRadius: "borderBottomLeftRadius",
};
const VALUE: Record<string, Record<string, string>> = {
  flexDirection: { "row-reverse": "row", row: "row-reverse" },
  textAlign: { right: "left", left: "right" },
  alignSelf: { "flex-end": "flex-start", "flex-start": "flex-end" },
  writingDirection: { rtl: "ltr", ltr: "rtl" },
};
export function mirror<T>(style: T): T {
  if (Array.isArray(style)) return style.map(mirror) as T;
  if (!style || typeof style !== "object") return style;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style as Record<string, unknown>)) {
    out[SWAP[k] || k] = typeof v === "string" && VALUE[k]?.[v] ? VALUE[k][v] : v;
  }
  return out as T;
}
// Alexandria has no Hebrew glyphs, so Hebrew uses Heebo at the same weights.
const HEEBO: Record<string, string> = {
  Alexandria_400Regular: "Heebo_400Regular",
  Alexandria_500Medium: "Heebo_500Medium",
  Alexandria_700Bold: "Heebo_700Bold",
  Alexandria_800ExtraBold: "Heebo_800ExtraBold",
};
export function hebrewFont<T>(style: T): T {
  if (Array.isArray(style)) return style.map(hebrewFont) as T;
  if (!style || typeof style !== "object") return style;
  const ff = (style as { fontFamily?: string }).fontFamily;
  return ff && HEEBO[ff] ? ({ ...style, fontFamily: HEEBO[ff] } as T) : style;
}
/** Adapt a style written for Arabic to the given language. */
export const adapt = <T>(style: T, lang: Lang): T =>
  lang === "en" ? mirror(style) : lang === "he" ? hebrewFont(style) : style;

const adapted: Record<Lang, WeakMap<object, object>> = {
  ar: new WeakMap(),
  he: new WeakMap(),
  en: new WeakMap(),
};
function adaptSheet<T extends Record<string, unknown>>(sheet: T, lang: Lang): T {
  if (lang === "ar") return sheet;
  const hit = adapted[lang].get(sheet);
  if (hit) return hit as T;
  const out = Object.fromEntries(Object.entries(sheet).map(([k, v]) => [k, adapt(v, lang)])) as T;
  adapted[lang].set(sheet, out);
  return out;
}

type IconName = keyof typeof Ionicons.glyphMap;

export function useT() {
  const { lang } = useStore();
  const rtl = lang !== "en";
  const t = useCallback(
    (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
  return useMemo(
    () => ({
      lang,
      rtl,
      t,
      /** Localized name/title of a restaurant, meal, mood or package. */
      name: (x: Named) => localName(lang, x),
      desc: (x: Parameters<typeof localDescription>[1]) => localDescription(lang, x),
      /** Adapt an inline style: mirrored for English, Hebrew font for Hebrew. */
      f: <S>(style: S): S => adapt(style, lang),
      /** Adapt a whole StyleSheet (cached per language). */
      sheet: <S extends Record<string, unknown>>(styles: S): S => adaptSheet(styles, lang),
      /** "Forward" arrows point left in RTL and right in LTR. */
      fwd: (icon: IconName): IconName =>
        (rtl ? icon : (icon.replace("-back", "-forward") as IconName)),
      /** Show a message that may be a translation key (errors from api.ts). */
      msg: (text: string) => (text in dict ? t(text as Key) : text),
      pkg: (level?: string) =>
        t(level === "plus" ? "pkgPlus" : level === "mix" ? "pkgMix" : "pkgClassic"),
    }),
    [lang, rtl, t],
  );
}
