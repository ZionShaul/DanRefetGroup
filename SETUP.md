# מדריך התקנה ופריסה — משקי דן: ניהול רכש רפתות

## 1. פרויקט Supabase

1. צרו פרויקט חדש ב-[supabase.com](https://supabase.com).
2. **SQL Editor** ← הריצו את התוכן של `supabase/migrations/0001_init.sql`. זה יוצר את הטבלאות
   (`organizations`, `profiles`, `monthly_uploads`, `order_lines`, `rejected_rows`), פונקציות העזר,
   מדיניות RLS, פונקציות ה-RPC (`publish_upload`, `get_active_upload`) ו-bucket האחסון `uploads`.
3. **Authentication ← Providers ← Email:** ודאו ש-Email מופעל. כניסה מתבצעת בקוד חד-פעמי (OTP)
   לאימייל. אין הרשמה עצמית — `shouldCreateUser:false` בקוד מונע יצירת משתמשים שלא הוקמו מראש.
4. (אופציונלי) **Authentication ← Email Templates ← Magic Link / OTP:** התאימו את נוסח המייל לעברית.

## 2. משתני סביבה

העתיקו `.env.local.example` ל-`.env.local` ומלאו (מתוך **Project Settings ← API**):

```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # anon public
SUPABASE_SERVICE_ROLE_KEY=...            # סודי! צד שרת בלבד
SUPABASE_UPLOADS_BUCKET=uploads
```

> ה-Service Role משמש רק בצד השרת (יצירת משתמשים, טעינה, פרסום) ולעולם אינו נחשף לדפדפן.

## 3. יצירת מנהל ראשון

```bash
node scripts/create-admin.mjs admin@example.com "שם מלא"
```
המשתמש נוצר ב-Auth + פרופיל עם `role=admin`. התחברו דרך מסך ההתחברות בקוד OTP לאותו אימייל.

## 4. הרצה מקומית

```bash
npm install
npm run dev      # http://localhost:3000
```

זרימת עבודה: התחברות כמנהל ← **ניהול ← טעינת קובץ** ← העלאת `merged_suppliers_*.xlsx` ← תצוגה מקדימה
← **פרסום**. לאחר מכן הוסיפו משתמשי רפת ב-**ניהול ← ניהול משתמשים** (שיוך כל משתמש לרפת שלו).

## 5. פריסה ל-Vercel

1. דחפו את הריפו ל-GitHub וייבאו ב-[vercel.com](https://vercel.com).
2. הגדירו את אותם משתני סביבה (כולל `SUPABASE_SERVICE_ROLE_KEY`) ב-**Project ← Settings ← Environment Variables**.
3. Build Command ברירת מחדל (`next build`). פרסו.
4. (מומלץ) הוסיפו את דומיין האתר ל-**Supabase ← Authentication ← URL Configuration ← Redirect URLs**.

## 6. בדיקת תקינות

- העלו קובץ אמיתי ובדקו שמספר הרפתות וסכום **יתרה למשיכה** לכל חומר תואמים לטבלת הסיכום באקסל המקורי.
- התחברו כמשתמש רפת ובדקו שרואים **רק** את נתוני הרפת שלו (בידוד RLS).
- בדקו במובייל: "הוספה למסך הבית", פריסת RTL ומיתוג ירוק.

## 7. קשירת מכשיר ומניעת שיתוף התחברות

המערכת קושרת כל משתמש רפת ל**מכשיר יחיד** ("מכשיר ראשון מנצח"): המכשיר הראשון שמתחבר נקשר לחשבון,
וכל מכשיר אחר נחסם עד שמנהל מאפס. מנהלים פטורים. כדי להפעיל, הריצו את `0004_device_binding.sql`.
לאיפוס מכשיר של משתמש (למשל בהחלפת טלפון): **ניהול → ניהול משתמשים → אפס מכשיר**.

הקשחה משלימה מומלצת ב-Supabase (ללא קוד) תחת **Authentication → Sessions**:
- **Single session per user** (אם הזמינה בתוכנית) – מבטל סשנים מקבילים.
- **Time-box / inactivity timeout** – דורש התחברות מחדש מעת לעת ומקטין חלון שיתוף.
- שמרו על תוקף קצר ל-OTP.
