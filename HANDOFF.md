# TAMAM: מסמך העברה (מצב נכון ל-9.10.2026)

## מה זה
TAMAM הוא מותג משלוחי אוכל בנצרת. הלקוח מסובב "גלגל מודים" (شو مودك هسا؟), מקבל הצעת ארוחה (חבילה) ומזמין. אותו קוד משמש גם כאפליקציה (Expo / React Native) וגם כאתר (Expo web).

## ריפוזיטוריז
| ריפו | תפקיד | מצב |
|---|---|---|
| **fhamati44-droid/craveit**, ענף **`feat/tamam-brand-supabase`** | **TAMAM, הקוד הפעיל.** כל העבודה בתיקייה `mobile/` | זה הענף שעובדים עליו. `main` עדיין מכיל רק את האפליקציה הישנה מ-Base44, ועוד לא מוזג |
| fhamati44-droid/food-crm-final | ה-CRM: מטבח, שליחים, מכירות, כספים, ManyChat webhook, סוכן AI. Next.js 15 על Vercel (food-crm-final.vercel.app) | לא שונה. ממשיך כמו שהוא |
| fhamati44-droid/craveit-nextjs | האתר הישן ללקוחות (craveit-nextjs.vercel.app) | יוחלף ב-TAMAM ויופנה אליו |

## ארכיטקטורה
- **Supabase הוא המקור היחיד לנתונים.** הפרויקט: `dcpqgxlgiitrdozkykbq`. ה-CRM, האתר הישן ו-TAMAM עובדים כולם על אותן טבלאות.
- **Base44 יצא לגמרי מ-TAMAM.** הוא לא בשימוש יותר ומתוכנן לכיבוי. בשורש הריפו `craveit` (`src/`, `base44/`) נשאר הקוד הישן של Base44 לעיון בלבד.
- האפליקציה מדברת עם Supabase ישירות דרך PostgREST, בלי ספרייה, ב-`fetch` עם anon key. הכול בקובץ `mobile/src/lib/api.ts`.
- ה-anon key הציבורי מוטמע כברירת מחדל ב-`api.ts`. אפשר לדרוס אותו עם `EXPO_PUBLIC_SUPABASE_ANON_KEY`. **ה-service_role key אסור בקוד.**

### טבלאות שבשימוש
- `restaurants` (כולל `kitchen_id`, `delivery_fee`, `active`), `menu_categories`, `menu_items`, `menu_extra_groups`, `menu_extras` (קשורה ל-group דרך `group_id`), `site_settings` (id=1: `covers`, `cover_url`, `logo_url`).
- `orders`: הטבלה המשותפת עם ה-CRM. ראו את מבנה ההזמנה למטה.
- **חדשות:** `tamam_moods`, `tamam_suggestion_sets`, `tamam_suggestion_items`. ה-SQL נמצא ב-`supabase/migrations/20261009000000_tamam.sql` (כבר הורץ). ה-RLS מאפשר לציבור לקרוא רק שורות פעילות, וכתיבה מותרת רק ב-service role. ה-ids הם text, כדי לשמור על ה-ids המקוריים מ-Base44.
  - הנתונים הועתקו מ-Base44 עם `scripts/migrate-base44-tamam.mjs`: 10 מודים, 72 חבילות, 53 פריטים. **חלק מהחבילות בלי פריטים.**

### מבנה הזמנה (חייב להתאים ל-CRM)
מוגדר ב-`mobile/src/lib/orders.ts`, `buildOrders()`. העתק מדויק של ה-checkout באתר הישן:
```
customer_name, phone, address ("איסוף עצמי" באיסוף), notes (כולל "תשלום: מזומן/אשראי בדלת"),
kitchen_id (מ-restaurant.kitchen_id), courier_id: null, channel ("אתר" | "אפליקציה"),
items ("שם ×כמות | ..."), order_items [{name, quantity, price, extras[{name,price}], item_total}],
drinks: null, dessert: null, quantity, amount (מנות + דמי משלוח), status: "new"
```
- **הזמנה נפרדת לכל מסעדה/מטבח.**
- שמות המנות להזמנה נלקחים קודם מ-`name` (עברית, למטבח) ורק אחר כך מ-`name_ar`.
- סטטוסים שה-CRM משתמש בהם: `new` → `confirmed` → `cooking` → `ready` → `delivered`, ו-`cancelled`.

## מבנה `mobile/`
- `src/app/(tabs)/`: `index` (בית), `restaurants` (استكشف), `game` (גלגל TAMAM), `orders` (طلباتي), `profile` (حسابي: שם, טלפון וכתובת נשמרים במכשיר).
- `src/app/`: `cart`, `checkout`, `order/[id]` (מעקב, polling כל 15 שניות), `suggestion/[id]` (חבילה + "ضيف الباقة للسلة"), `suggestions`, `restaurant/[id]`.
- `src/components/`:
  - `brand.tsx`: לוגו SVG, TamamMark, משולשים, Brush (תגית מחיר).
  - `MoodWheel.tsx`: גלגל עם Reanimated, haptics ו-reduced motion.
  - `TabBar.tsx`: סרגל RTL עם כפתור TAMAM מורם.
  - `cards.tsx`, `ui.tsx`: tokens של צבעים, `RtlRow`.
- `src/lib/`: `api.ts`, `orders.ts`, `state.tsx` (סל, לקוח, מזהי הזמנות ב-AsyncStorage), `types.ts`, `moods.ts` (אייקון למוד).
- `public/index.html`: Meta Pixel `978560778428490`, Microsoft Clarity `wqm7t9tbua`, שמירת ManyChat `?mc_id=` ל-localStorage, ו-`site-events.js` (tracker ל-CRM ב-Railway). כולם הועתקו מהאתר הישן. אירוע `Purchase` נשלח ב-checkout.
- `vercel.json`: `npx expo export --platform web` → `dist`, עם rewrite של SPA.
- `tests/`: `node --test`, 12 בדיקות ל-`api.ts` ול-`orders.ts`.

## שפות: ערבית, עברית ואנגלית
- `mobile/src/lib/i18n.ts`: מילון אחד לכל הטקסטים (`t("key")`), עם בדיקה שאין מפתח שחסר בשפה כלשהי.
  - **טקסט חדש מוסיפים קודם למילון בשלוש השפות.** לא כותבים טקסט ישירות בקומפוננטה.
- הבחירה נשמרת במכשיר. באתר אפשר גם לקבוע שפה מהקישור, למשל `?lang=he` / `?lang=en` (שימושי ל-ManyChat).
- הסגנונות כתובים בכיוון RTL. ב-`useT().sheet(styles)` / `f(style)` הם **מתהפכים אוטומטית לאנגלית**, ובעברית מוחלף הפונט ל-Heebo (ל-Alexandria אין אותיות עבריות). הקומפוננטה `LangSwitch` (ע | עב | EN) נמצאת בכותרת, במסך המשחק ובפרופיל.
- שמות מהנתונים:
  - ערבית: `name_ar`. עברית: `name` (העמודה הזאת בעברית). אנגלית: `name_en`, ואם הוא ריק אז `name`.
  - למודים ולחבילות יש עמודות אופציונליות `name_he/name_en/title_he/title_en/description_*`. ה-SQL נמצא ב-`supabase/migrations/20261009010000_tamam_translations.sql`. לעשרת המודים המוכרים יש תרגום מובנה בקוד.
- **ההזמנה שנשלחת למטבח תמיד בעברית**, בלי קשר לשפת הלקוח.

## מוסכמות עיצוב
- צבעים: רקע `#F6F5F0`, טורקיז מותג `#06463F`, ירוק מותג `#3FA34D`. פונט Alexandria (400/500/700/800).
- מסך המשחק טורקיז כהה עם משולשים.
- ערבית מדוברת פלסטינית/צפונית ("شو بدك"، "هسا"), עברית יומיומית ואנגלית פשוטה.
- **RTL ידני:** משתמשים ב-`flexDirection: "row-reverse"` ו-`textAlign: "right"`, ותמיד דרך `sheet()` / `f()` כדי שאנגלית תתהפך. לא מגדירים `dir="rtl"` על ה-html, כי זה הופך את כל הפריסה.
- רשימות אופקיות עוברות דרך `RtlRow`, שגולל להתחלה.

## הרצה ובדיקות
```
cd mobile
npm install
npx expo start -c            # --tunnel לשיתוף; צריך npm i -D @expo/ngrok@^4.1.0
npx tsc --noEmit && npx expo lint && npm test
npx expo export --platform web
```

## פריסה
- **Vercel:** פרויקט `tamam` בצוות `fhamati44-droids-projects` → **https://tamam-zeta.vercel.app**.
  - כרגע מועלה ידנית עם `npx vercel --prod` מתוך `mobile/`. הוא **עוד לא מחובר ל-Git**.
- **Expo / EAS:** project id `33a3b10b-e776-48ff-98b5-d04d547e9f6e`, bundle `com.craveit.tamam`.

## מה נשאר לעשות (לפי סדר)
1. לאמת שהאתר החי מציג מסעדות ומודים אמיתיים.
2. לכבות או להשהות את Base44. TAMAM לא פונה אליו.
3. ב-ManyChat: להחליף קישורים לאתר הישן ב-`https://tamam-zeta.vercel.app/?mc_id={{contact id}}`.
4. ב-craveit-nextjs: להוסיף `vercel.json` עם redirect לאתר החדש.
5. למזג את `feat/tamam-brand-supabase` ל-`main`, ולחבר את Vercel ל-Git עם Root Directory `mobile`.
6. להשלים פיצ'רים מהאתר הישן שעוד חסרים:
   - צ'אט שמחובר לסוכן ב-CRM (`food-crm-final.vercel.app/api/agent-website`).
   - מבצעים (`deals`).
   - כפתור וואטסאפ צף (המספר `972544616474`).
7. למלא את החבילות שאין בהן פריטים ב-`tamam_suggestion_items`.
8. דומיין משלכם. בניית APK עם EAS.

## אבטחה (פתוח)
- **RLS על `orders`:** הזמנות נוצרות עם ה-anon key, ו"طلباتي"/מעקב קוראים לפי id ולפי טלפון, כמו באתר הישן. צריך להחמיר את ה-RLS ולעבור לקריאה דרך Edge Function.
- **ב-food-crm-final:** ב-README כתובים admin/0000 וסוד ה-webhook של ManyChat. צריך להחליף את שניהם ולמחוק מה-README.
- באתר הישן מוטמע anon key ישן כ-fallback. הוא לא תקף ("Invalid API key").
