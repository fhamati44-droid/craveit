# מעבר ל-TAMAM: אתר + אפליקציה מקוד אחד

## המבנה

```
                 ┌──────────────── Supabase (dcpqgxlgiitrdozkykbq) ────────────────┐
                 │ restaurants · menu_* · orders · kitchens · tamam_* (חדש)        │
                 └───────▲──────────────────────▲──────────────────────▲──────────┘
                         │                      │                      │
   TAMAM (mobile/)  ─────┘      food-crm-final ─┘    craveit-nextjs ───┘  ← יוחלף
   אפליקציה + אתר          מטבח · שליחים · מכירות · ManyChat
```

- **Supabase** הוא המקור היחיד לנתונים. כבר היום כל המערכות עובדות מולו.
- **food-crm-final** נשאר כמו שהוא, כמשרד האחורי. הזמנות מ-TAMAM נכנסות לטבלה `orders` באותו מבנה בדיוק כמו מהאתר הישן (`status: 'new'`, `kitchen_id`, `order_items`...). המטבח רואה אותן מיד. בשדה `channel` יופיע "אתר" או "אפליקציה".
- **craveit-nextjs** יוחלף באתר שנבנה מאותו קוד של האפליקציה.
- **Base44** יוצא מהתמונה אחרי שלב 2.

## שלב 1: לבדוק את הענף

```powershell
git clone https://github.com/fhamati44-droid/craveit
cd craveit
git checkout feat/tamam-brand-supabase
cd mobile
npm install
npx expo start -c
```

האפליקציה כבר קוראת מסעדות, תפריטים והזמנות **ישר מ-Supabase**. המודים והצעות TAMAM עדיין מגיעים מ-Base44 עד שלב 2. המעבר ביניהם אוטומטי.

> ⚠️ הזמנה שתבצע בבדיקה היא **הזמנה אמיתית**: היא תופיע במטבח ב-CRM. כדאי לבחור "استلام من المطعم", לכתוב בהערות "בדיקה" ולבטל אותה ב-CRM.

## שלב 2: להעביר את TAMAM מ-Base44 ל-Supabase

1. ב-Supabase: **SQL Editor** → מדביקים את התוכן של `supabase/migrations/20261009000000_tamam.sql` → **Run**.
   - נוצרות 3 טבלאות. לקוחות יכולים רק לקרוא שורות פעילות, וכתיבה מותרת רק למנהל.
2. מעתיקים את הנתונים. מריצים מתיקיית `craveit`, לא מ-`mobile`:
   ```powershell
   node scripts/migrate-base44-tamam.mjs
   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key מ-Supabase → Settings → API>"
   node scripts/migrate-base44-tamam.mjs --write
   ```
   - ההרצה הראשונה, בלי `--write`, רק סופרת ולא כותבת כלום.
   - את המפתח `service_role` **לא שומרים בקוד ולא שולחים לאף אחד**.
3. זהו. האפליקציה מזהה את הטבלאות לבד ומפסיקה לפנות ל-Base44.
   - מעכשיו עורכים מודים וחבילות ב-Supabase, ב-**Table Editor**.

## שלב 3: להעלות את האתר החדש ל-Vercel

1. ב-Vercel: **Add New → Project** → בוחרים את הריפו `craveit`.
2. **Root Directory**: `mobile`. את שאר ההגדרות קובע הקובץ `mobile/vercel.json` (בנייה עם `expo export`, תיקייה `dist`).
3. ענף: `feat/tamam-brand-supabase`, או `main` אחרי מיזוג.
4. מקבלים כתובת כמו `tamam-xxx.vercel.app` ובודקים הזמנה אחת.

Meta Pixel, Microsoft Clarity, זיהוי ManyChat (`?mc_id=`) וה-tracker של ה-CRM (`site-events.js`) הועתקו מהאתר הישן. אירוע ה-Purchase נשלח גם הוא.

## שלב 4: ההחלפה

1. ב-ManyChat ובכל מקום שיש קישור לאתר הישן, מחליפים לכתובת החדשה. משאירים את `?mc_id={{contact id}}` בקישורים.
2. מפנים את האתר הישן לחדש, כדי שקישורים ישנים ימשיכו לעבוד. ב-craveit-nextjs יוצרים קובץ `vercel.json`:
   ```json
   { "redirects": [{ "source": "/(.*)", "destination": "https://<הכתובת-החדשה>/", "permanent": false }] }
   ```
3. אחרי שבוע-שבועיים שהכול יציב: מעבירים את craveit-nextjs לארכיון ב-GitHub ומכבים את Base44.

## אבטחה: לפני שמגדילים תנועה

- **RLS על `orders`**: האתר הישן (וגם TAMAM) יוצרים הזמנות עם המפתח הציבורי. צריך לוודא שב-Supabase מופעל RLS כך שמותר `insert`, אבל אי אפשר לקרוא את כל ההזמנות של כולם.
  - כרגע מסך "طلباتي" ומעקב ההזמנה קוראים לפי מזהה ולפי טלפון, בדיוק כמו באתר הישן.
  - כשמחמירים את RLS, צריך לעבור לקריאה דרך פונקציה בשרת. זה השלב הבא.
- **food-crm-final**: ב-README כתובים סיסמת מנהל ברירת מחדל וסוד ה-webhook של ManyChat. צריך להחליף את שניהם ב-Vercel ולמחוק אותם מה-README.

## מה עוד חסר באפליקציה לעומת האתר הישן

- צ'אט האתר שמחובר לסוכן ב-CRM (`/api/agent-website`).
- מבצעים (`deals`) וקאברים מ-`site_settings`.
- כפתור וואטסאפ צף.
- תשלום אונליין: גם באתר הישן אין, יש רק מזומן ואשראי בדלת.
