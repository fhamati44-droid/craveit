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
  callUs: { ar: "اتصل بتمام", he: "התקשרו ל‑TAMAM", en: "Call TAMAM" },
  dailyHelpMessage: { ar: "مرحبا، بدي أستفسر عن وجبات اليوم.", he: "היי, אשמח לשאול על ארוחות היום.", en: "Hi, I have a question about today's meals." },

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
  restaurantLandingEyebrow: { ar: "مطاعم محلية · نكهات قريبة", he: "מסעדות מקומיות · טעמים קרובים", en: "Local restaurants · nearby flavors" },
  restaurantLandingSub: { ar: "شوف المطاعم المفتوحة، وقارن وقت التوصيل والحد الأدنى قبل ما تختار.", he: "ראו מי פתוח והשוו זמן משלוח ומינימום הזמנה לפני הבחירה.", en: "See what's open and compare delivery time and minimum order before choosing." },

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
  suggestionsLandingTitle: { ar: "اختار الباقة اللي بتناسبك", he: "בחרו את החבילה שמתאימה לכם", en: "Find the package that fits" },
  suggestionsLandingSub: { ar: "فلتر حسب نوع الباقة، وشوف السعر والتفاصيل قبل ما تطلب.", he: "סננו לפי סוג החבילה וראו מחיר ופרטים לפני ההזמנה.", en: "Filter by package type and see the price and details before ordering." },
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

  // daily meal reservation and admin
  dailyMeal: { ar: "وجبة", he: "ארוחה", en: "Meal" },
  dailyChooseMeal: { ar: "اختيار الوجبة", he: "בחירת ארוחה", en: "Choose meal" },
  dailyHomeCard: { ar: "ركّب وجبة اليوم", he: "מרכיבים את ארוחת היום", en: "Build today's meal" },
  dailyHomeSub: { ar: "اختار التاريخ والوجبة الأساسية، وأضف شوربة أو إضافة أو سلطة إذا بتحب.", he: "בוחרים תאריך ומנה עיקרית, ואפשר להוסיף מרק, תוספת או סלט.", en: "Choose a date and main dish, then add soup, an addition, or a salad if you like." },
  dailyEyebrow: { ar: "TAMAM · وجبتك على ذوقك", he: "TAMAM · הארוחה שלך בדרך שלך", en: "TAMAM · your meal, your way" },
  dailyTitle: { ar: "اختار وجبة اليوم", he: "בוחרים את ארוחת היום", en: "Choose today's meal" },
  dailyLandingHeadline: { ar: "اختار وجبتك على مزاجك", he: "בחרו ארוחה שמתאימה לכם", en: "Choose a meal your way" },
  dailySub: { ar: "مكوّنات كل وجبة وخياراتها ظاهرة قبل الاختيار.", he: "מרכיבי כל ארוחה והאפשרויות שלה מוצגים מראש.", en: "See every meal's ingredients and choices before you select." },
  dailyDate: { ar: "التاريخ", he: "תאריך", en: "Date" },
  dailySoup: { ar: "الشوربة", he: "מרק", en: "Soup" },
  dailyMain: { ar: "الأساسي", he: "מנה עיקרית", en: "Main" },
  dailyAddition: { ar: "الإضافة", he: "תוספת", en: "Addition" },
  dailySalad: { ar: "السلطة", he: "סלט", en: "Salad" },
  dailyYourDetails: { ar: "بيانات الحجز", he: "פרטי ההזמנה", en: "Reservation details" },
  dailyMealSummary: { ar: "ملخص الوجبة", he: "סיכום הארוחה", en: "Meal summary" },
  dailyCart: { ar: "سلة الوجبات ({n})", he: "סל הארוחות ({n})", en: "Meal cart ({n})" },
  dailyCartLines: { ar: "أصناف بالطلب", he: "פריטים בהזמנה", en: "items in the order" },
  dailyCheckout: { ar: "راجع الطلب · {n} وجبات", he: "לבדיקת ההזמנה · {n} ארוחות", en: "Review order · {n} meals" },
  dailyCartEmpty: { ar: "ضيف وجبة للسلة أولاً.", he: "הוסיפו ארוחה לסל קודם.", en: "Add a meal to your cart first." },
  dailyCheckoutTitle: { ar: "راجع وجباتك وطريقة الاستلام", he: "בדקו את הארוחות ואופן הקבלה", en: "Review your meals and how to receive them" },
  dailyReceiveMethod: { ar: "كيف بتحب تستلم الطلب؟", he: "איך תרצו לקבל את ההזמנה?", en: "How would you like to receive the order?" },
  dailyDelivery: { ar: "توصيل", he: "משלוח", en: "Delivery" },
  dailyPickup: { ar: "استلام من المطعم", he: "איסוף מהמסעדה", en: "Pickup" },
  dailyPickupHint: { ar: "الاستلام بيكون من المطعم أو المطبخ اللي محضّر الوجبة.", he: "האיסוף מהמסעדה או מהמטבח שהכין את הארוחה.", en: "Pick up from the restaurant or kitchen preparing each meal." },
  dailyPickupMulti: { ar: "الاستلام من كل مطعم على حدة: {names}", he: "האיסוף מכל מסעדה בנפרד: {names}", en: "Pick up from each restaurant separately: {names}" },
  dailyNotesLabel: { ar: "ملاحظة (اختياري)", he: "הערה (לא חובה)", en: "Note (optional)" },
  dailyNotesPlaceholder: { ar: "أي تفاصيل بدك توصل للمطعم", he: "פרטים שתרצו להעביר למסעדה", en: "Anything you'd like the restaurant to know" },
  dailyBackToMeals: { ar: "رجوع للوجبات", he: "חזרה לארוחות", en: "Back to meals" },
  dailyAddMealToCart: { ar: "ضيف للسلة", he: "הוספה לסל", en: "Add to cart" },
  dailyConfirmOrder: { ar: "أرسل الطلب · {p} ₪", he: "שליחת ההזמנה · {p} ₪", en: "Place order · {p} ₪" },
  dailyOrderSummary: { ar: "طلبك فيه {n} وجبات · المجموع {p} ₪", he: "בהזמנה {n} ארוחות · סה״כ {p} ₪", en: "Your order has {n} meals · total {p} ₪" },
  dailyPickDate: { ar: "اختار اليوم المناسب", he: "בחרו את היום המתאים", en: "Choose a date" },
  dailyWeekTitle: { ar: "تصفح باقي الأسبوع", he: "עיון בשאר השבוע", en: "Browse the rest of the week" },
  dailyTodayMeals: { ar: "وجبات اليوم", he: "ארוחות היום", en: "Today's meals" },
  dailyTodayShort: { ar: "اليوم", he: "היום", en: "Today" },
  dailyDayMealsCount: { ar: "{n} وجبات", he: "{n} ארוחות", en: "{n} meals" },
  dailyNoMenusShort: { ar: "ما في", he: "אין", en: "None" },
  dailyNoMenusThisDay: { ar: "ما في وجبات منشورة بهذا اليوم. اختار يوم ثاني من الأسبوع.", he: "לא פורסמו ארוחות ליום הזה. בחרו יום אחר השבוע.", en: "No meals are published for this day. Choose another day this week." },
  dailyMealPreview: { ar: "محتويات الوجبة والخيارات المتاحة", he: "מה כלול ואילו אפשרויות זמינות", en: "Meal contents and available choices" },
  dailyPreviewChooseOneRequired: { ar: "اختار واحد (ضمن السعر)", he: "בחרו אחת (כלול במחיר)", en: "choose one (included)" },
  dailyPreviewChooseOneOptional: { ar: "اختياري · اختار واحد (ضمن السعر)", he: "לבחירה · בחרו אחת (כלול במחיר)", en: "optional · choose one (included)" },
  dailyPreviewNoMain: { ar: "ما في وجبة أساسية متاحة حالياً", he: "אין כרגע מנה עיקרית זמינה", en: "No main dish currently available" },
  dailyPreviewWithoutSoup: { ar: "بدون شوربة", he: "ללא מרק", en: "No soup" },
  dailyPreviewWithoutAddition: { ar: "بدون إضافة", he: "ללא תוספת", en: "No addition" },
  dailyPreviewWithoutSalad: { ar: "بدون سلطة", he: "ללא סלט", en: "No salad" },
  dailyNoMenus: { ar: "ما في وجبات منشورة للحجز حالياً.", he: "אין כרגע ארוחות שפורסמו להזמנה.", en: "No published meals are available right now." },
  dailyNoOptions: { ar: "ما في خيارات منشورة بهالقسم.", he: "אין אפשרויות שפורסמו בקטגוריה הזו.", en: "No published options in this category." },
  dailySoupOptional: { ar: "الشوربة اختيارية، فيك تكمّل بدون ما تختار شوربة.", he: "המרק הוא לבחירה, אפשר להמשיך גם בלי לבחור מרק.", en: "Soup is optional. You can continue without choosing one." },
  dailySkipSoup: { ar: "بدون شوربة", he: "בלי מרק", en: "Skip soup" },
  dailyStageOptional: { ar: "هذا القسم اختياري، فيك تكمل بدونه.", he: "הקטגוריה הזו לבחירה, אפשר להמשיך בלעדיה.", en: "This category is optional. You can continue without it." },
  dailySkipAddition: { ar: "بدون إضافة", he: "בלי תוספת", en: "Skip addition" },
  dailySkipSalad: { ar: "بدون سلطة", he: "בלי סלט", en: "Skip salad" },
  dailyChooseDate: { ar: "اختار تاريخ الوجبة أولاً.", he: "בחרו קודם תאריך לארוחה.", en: "Choose a meal date first." },
  dailyChooseOption: { ar: "اختار خيار قبل ما تكمّل.", he: "בחרו אפשרות לפני שממשיכים.", en: "Choose an option before continuing." },
  dailyFinishChoices: { ar: "اختار الوجبة الأساسية عشان تكمل الحجز.", he: "בחרו מנה עיקרית כדי להמשיך להזמנה.", en: "Choose a main dish to continue with the reservation." },
  dailyQuantity: { ar: "عدد الوجبات", he: "כמות ארוחות", en: "Meal quantity" },
  dailyBack: { ar: "رجوع", he: "חזרה", en: "Back" },
  dailyContinue: { ar: "كمّل", he: "המשך", en: "Continue" },
  dailyReserve: { ar: "أكّد الحجز", he: "אישור הזמנה", en: "Reserve" },
  dailyThanks: { ar: "وصلنا حجزك", he: "קיבלנו את ההזמנה", en: "Reservation received" },
  dailyReservationReceived: { ar: "رح نتواصل معك لتأكيد التفاصيل.", he: "ניצור קשר לאישור הפרטים.", en: "We'll contact you to confirm the details." },
  adminDailyMeals: { ar: "إدارة وجبة اليوم", he: "ניהול ארוחת היום", en: "Daily meal admin" },
  adminLoginTitle: { ar: "دخول الإدارة", he: "כניסת מנהל", en: "Admin sign in" },
  adminEmail: { ar: "البريد الإلكتروني", he: "אימייל", en: "Email" },
  adminPassword: { ar: "كلمة المرور", he: "סיסמה", en: "Password" },
  adminForgotPassword: { ar: "نسيت كلمة المرور؟ أرسل رابط تعيين", he: "שכחת סיסמה? שליחת קישור לאיפוס", en: "Forgot password? Send a reset link" },
  adminNewPassword: { ar: "كلمة المرور الجديدة", he: "סיסמה חדשה", en: "New password" },
  adminConfirmPassword: { ar: "تأكيد كلمة المرور", he: "אימות סיסמה", en: "Confirm password" },
  adminSavePassword: { ar: "حفظ كلمة المرور", he: "שמירת הסיסמה", en: "Save password" },
  adminRecoverySent: { ar: "إذا الحساب موجود، رح يوصلك إيميل فيه رابط تعيين كلمة المرور. افتحيه من نفس الجهاز.", he: "אם החשבון קיים, יישלח אלייך אימייל עם קישור לאיפוס הסיסמה. פתחי אותו מאותו מכשיר.", en: "If the account exists, you'll receive an email with a password reset link. Open it on this device." },
  adminRecoveryError: { ar: "تعذر إرسال رابط تعيين كلمة المرور. جرّبي مرة ثانية بعد قليل.", he: "לא ניתן לשלוח קישור לאיפוס הסיסמה. נסו שוב בעוד רגע.", en: "Couldn't send a password reset link. Try again shortly." },
  adminPasswordTooShort: { ar: "كلمة المرور لازم تكون 8 أحرف على الأقل.", he: "הסיסמה חייבת להכיל לפחות 8 תווים.", en: "Password must be at least 8 characters." },
  adminPasswordsMismatch: { ar: "كلمتا المرور مش متطابقتين.", he: "הסיסמאות אינן תואמות.", en: "The passwords don't match." },
  adminPasswordUpdated: { ar: "تم تعيين كلمة المرور. هسا سجّلي الدخول فيها.", he: "הסיסמה נשמרה. עכשיו אפשר להתחבר איתה.", en: "Password saved. Sign in with it now." },
  adminSignIn: { ar: "دخول", he: "כניסה", en: "Sign in" },
  adminSignOut: { ar: "تسجيل خروج", he: "התנתקות", en: "Sign out" },
  adminNotAllowed: { ar: "هذا الحساب مش مضاف كمدير لوجبة اليوم.", he: "החשבון הזה אינו מורשה לניהול ארוחת היום.", en: "This account is not authorized to manage daily meals." },
  adminMenus: { ar: "قوائم الوجبات", he: "תפריטי הארוחות", en: "Meal menus" },
  adminReservations: { ar: "الحجوزات", he: "הזמנות", en: "Reservations" },
  adminNewMenu: { ar: "قائمة جديدة", he: "תפריט חדש", en: "New menu" },
  adminRestaurantId: { ar: "رقم المطعم", he: "מספר מסעדה", en: "Restaurant ID" },
  adminChooseRestaurant: { ar: "اختار المطعم بالاسم", he: "בחרו מסעדה לפי שם", en: "Choose a restaurant by name" },
  adminNoRestaurants: { ar: "ما في مطاعم فعّالة للاختيار.", he: "אין מסעדות פעילות לבחירה.", en: "No active restaurants are available." },
  adminTitle: { ar: "عنوان القائمة", he: "כותרת התפריט", en: "Menu title" },
  adminDate: { ar: "تاريخ الخدمة", he: "תאריך הגשה", en: "Service date" },
  adminStartDate: { ar: "تاريخ بداية الظهور", he: "תאריך תחילת ההופעה", en: "First day shown" },
  adminRepeatDaily: { ar: "تظهر كل يوم", he: "להציג בכל יום", en: "Show every day" },
  adminRepeatDailyHint: { ar: "تظهر من التاريخ المحدد في كل يوم، طالما القائمة منشورة. لإيقافها أزل علامة الصح أو أوقف النشر.", he: "מוצגת בכל יום מהתאריך שנבחר כל עוד התפריט מפורסם. כדי לעצור, הסירו את הסימון או בטלו את הפרסום.", en: "Show this meal every day from the selected date while published. Uncheck or unpublish it to stop." },
  adminRepeatMigration: { ar: "لازم إضافة عمود التكرار في Supabase أولًا قبل حفظ وجبة يومية متكررة.", he: "צריך להוסיף תחילה את עמודת החזרה ב־Supabase לפני שמירת ארוחה יומית קבועה.", en: "Add the recurring-meal column in Supabase before saving a repeating meal." },
  adminPrice: { ar: "السعر", he: "מחיר", en: "Price" },
  adminPublish: { ar: "نشر القائمة", he: "פרסום התפריט", en: "Publish menu" },
  adminAddMenu: { ar: "حفظ القائمة", he: "שמירת התפריט", en: "Save menu" },
  adminDuplicateMenu: { ar: "في قائمة موجودة لهذا المطعم بهذا التاريخ. اختارها من قائمة الوجبات الموجودة وأضف الأصناف عليها بدل إنشاء قائمة ثانية.", he: "כבר קיים תפריט למסעדה הזו בתאריך הזה. בחרו אותו מרשימת התפריטים והוסיפו אליו את המנות במקום ליצור תפריט נוסף.", en: "A menu already exists for this restaurant on this date. Select it from the existing menus and add items to it instead of creating another menu." },
  adminAddOption: { ar: "إضافة خيار", he: "הוספת אפשרות", en: "Add option" },
  adminEditOption: { ar: "تعديل الخيار", he: "עריכת אפשרות", en: "Edit option" },
  adminOptionName: { ar: "اسم الخيار بالعربي", he: "שם האפשרות", en: "Option name" },
  adminCategory: { ar: "القسم", he: "קטגוריה", en: "Category" },
  adminStatus: { ar: "الحالة", he: "סטטוס", en: "Status" },
  adminSave: { ar: "حفظ", he: "שמירה", en: "Save" },
  adminRefresh: { ar: "تحديث", he: "רענון", en: "Refresh" },
  adminEmptyReservations: { ar: "ما في حجوزات لحد الآن.", he: "אין הזמנות עדיין.", en: "No reservations yet." },
  adminCustomer: { ar: "الزبون", he: "לקוח", en: "Customer" },
  adminPhone: { ar: "الهاتف", he: "טלפון", en: "Phone" },
  adminQty: { ar: "العدد", he: "כמות", en: "Qty" },
  adminMenuId: { ar: "قائمة رقم", he: "תפריט מס׳", en: "Menu #" },
  adminLoadError: { ar: "تعذر تحميل بيانات الإدارة.", he: "לא ניתן לטעון את נתוני הניהול.", en: "Couldn't load admin data." },
  adminSaved: { ar: "انحفظ التعديل.", he: "השינוי נשמר.", en: "Changes saved." },
  adminDescription: { ar: "الوصف (اختياري)", he: "תיאור (לא חובה)", en: "Description (optional)" },
  adminSharedOptionsHint: { ar: "الشوربات والإضافات والسلطات تُضاف مرة واحدة وتظهر مع كل المطاعم.", he: "מרקים, תוספות וסלטים מוסיפים פעם אחת והם מופיעים בכל המסעדות.", en: "Soups, additions, and salads are added once and appear for every restaurant." },
  adminMenuOptionSettings: { ar: "خيارات هذه الوجبة", he: "אפשרויות לארוחה הזו", en: "Options for this meal" },
  adminMenuOptionSettingsHint: { ar: "الخيارات والصور محفوظة بالمكتبة. افتراضيًا تظهر كلها؛ خصّص وجبة معيّنة عند الحاجة فقط.", he: "האפשרויות והתמונות נשמרות בספרייה. כברירת מחדל כולן מוצגות; התאימו ארוחה מסוימת רק כשצריך.", en: "Options and photos stay in the library. All are shown by default; customize a meal only when needed." },
  adminSelectMenuFirst: { ar: "احفظ الوجبة أو اختارها من القائمة حتى تعدّل الخيارات.", he: "שמרו ארוחה או בחרו אותה מהרשימה כדי לערוך אפשרויות.", en: "Save a meal or select one from the list to edit its options." },
  adminAllSharedOptions: { ar: "كل الخيارات المحفوظة متاحة لهذه الوجبة.", he: "כל האפשרויות השמורות זמינות לארוחה הזו.", en: "All saved options are available for this meal." },
  adminSelectedOptions: { ar: "خيار متاح", he: "אפשרויות זמינות", en: "options available" },
  adminCustomizeForMenu: { ar: "تخصيص الخيارات لهذه الوجبة", he: "התאמת האפשרויות לארוחה הזו", en: "Customize options for this meal" },
  adminNoSharedOptions: { ar: "ما في خيارات محفوظة بهالقسم. أضفها مرة واحدة من مكتبة الخيارات.", he: "אין אפשרויות שמורות בקטגוריה. הוסיפו אותן פעם אחת לספריית האפשרויות.", en: "No saved options in this category. Add them once to the options library." },
  adminUseAllSharedOptions: { ar: "استخدام كل الخيارات المحفوظة", he: "שימוש בכל האפשרויות השמורות", en: "Use all saved options" },
  adminSaveMenuOptionSettings: { ar: "حفظ خيارات الوجبة", he: "שמירת אפשרויות הארוחה", en: "Save meal options" },
  adminMainOptionsHint: { ar: "الوجبة الأساسية خاصة بقائمة المطعم والتاريخ المختارة.", he: "המנה העיקרית שייכת לתפריט המסעדה והתאריך שנבחרו.", en: "Main dishes belong to the selected restaurant and date menu." },
  adminChooseMenuForMain: { ar: "اختر قائمة يومية من الأعلى لإضافة وجبة أساسية لها.", he: "בחרו תפריט יומי למעלה כדי להוסיף לו מנה עיקרית.", en: "Select a daily menu above to add a main dish to it." },
  adminOptionActive: { ar: "متاح للزبائن", he: "זמין ללקוחות", en: "Available to customers" },
  adminOptionInactive: { ar: "موقوف مؤقتًا — الحجوزات السابقة محفوظة", he: "מושהה זמנית — ההזמנות הקודמות נשמרו", en: "Temporarily unavailable — past reservations are preserved" },
  adminDeactivateOption: { ar: "إيقاف الخيار مؤقتًا", he: "השבתת האפשרות זמנית", en: "Deactivate option" },
  adminActivateOption: { ar: "إعادة تفعيل الخيار", he: "הפעלת האפשרות מחדש", en: "Reactivate option" },
  adminOptionImage: { ar: "صورة الخيار", he: "תמונת האפשרות", en: "Option image" },
  adminMenuImage: { ar: "صورة الوجبة", he: "תמונת הארוחה", en: "Meal photo" },
  adminPasteImageUrl: { ar: "أو الصق رابط صورة مباشر", he: "או הדביקו קישור ישיר לתמונה", en: "Or paste a direct image URL" },
  adminInvalidImageUrl: { ar: "رابط الصورة غير صالح. استخدم رابطًا يبدأ بـ http أو https.", he: "קישור התמונה אינו תקין. השתמשו בקישור שמתחיל ב־http או https.", en: "Invalid image URL. Use a link starting with http or https." },
  adminSaveMenuFirst: { ar: "احفظ الوجبة أولًا، ثم اخترها من القائمة لرفع الصورة.", he: "שמרו את הארוחה תחילה, ואז בחרו אותה מהרשימה כדי להעלות תמונה.", en: "Save the meal first, then select it from the list to upload a photo." },
  adminImageSaveHint: { ar: "بعد اختيار الصورة، اضغط حفظ القائمة لتظهر للزبائن.", he: "אחרי בחירת התמונה, לחצו על שמירת התפריט כדי להציג אותה ללקוחות.", en: "After choosing the photo, save the menu to show it to customers." },
  adminUploadImage: { ar: "اختار صورة من جهازك", he: "בחירת תמונה מהמכשיר", en: "Choose an image from your device" },
  adminUploading: { ar: "جاري رفع الصورة…", he: "התמונה עולה…", en: "Uploading image…" },
  adminImageUploadError: { ar: "تعذر رفع الصورة. جرّب صورة ثانية.", he: "לא ניתן להעלות את התמונה. נסו תמונה אחרת.", en: "Couldn't upload the image. Try another one." },
  adminUnpublished: { ar: "غير منشورة", he: "לא פורסם", en: "Unpublished" },
  adminPublished: { ar: "منشورة", he: "פורסם", en: "Published" },
  adminNew: { ar: "جديد", he: "חדש", en: "New" },
  adminConfirmed: { ar: "مؤكد", he: "אושר", en: "Confirmed" },
  adminCancelled: { ar: "ملغي", he: "בוטל", en: "Cancelled" },
  adminCompleted: { ar: "مكتمل", he: "הושלם", en: "Completed" },

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
      /** Package badge in the chosen language, else the package level. */
      badge: (x: { badge_text_ar?: string; badge_text_he?: string; badge_text_en?: string; package_level?: string }) =>
        (lang === "ar" ? x.badge_text_ar : lang === "he" ? x.badge_text_he : x.badge_text_en) ||
        t(x.package_level === "plus" ? "pkgPlus" : x.package_level === "mix" ? "pkgMix" : "pkgClassic"),
      pkg: (level?: string) =>
        t(level === "plus" ? "pkgPlus" : level === "mix" ? "pkgMix" : "pkgClassic"),
    }),
    [lang, rtl, t],
  );
}
