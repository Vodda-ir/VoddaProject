# ورود با گوگل (Google OAuth) — راهنمای فعال‌سازی

جریان کامل پیاده‌سازی شده است (بک‌اند + فرانت). تا وقتی کلیدها خالی باشند،
دکمهٔ «ورود با گوگل» در صفحهٔ ورود نمایش داده نمی‌شود و مسیرها خطای 404 می‌دهند.

## فعال‌سازی در ۳ قدم

1. در Google Cloud Console یک OAuth Client (Web application) بسازید:
   - Authorized redirect URI:
     `https://api.vodda.ir/api/v1/auth/google/callback`
2. کلیدها را در فایل `.env` کنار `docker-compose.deploy.yml` روی سرور اضافه کنید:

   ```env
   GOOGLE_OAUTH_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxxxxxx
   # پیش‌فرض همین است؛ فقط اگر متفاوت است ست کنید:
   # GOOGLE_OAUTH_REDIRECT_URI=https://api.vodda.ir/api/v1/auth/google/callback
   ```

3. سرویس بک‌اند را ری‌استارت کنید:

   ```bash
   docker compose -f docker-compose.deploy.yml up -d backend
   ```

بعد از ری‌استارت، `GET /api/v1/auth/google/status` باید
`{"data":{"enabled":true}}` بدهد و دکمهٔ گوگل در صفحهٔ ورود ظاهر می‌شود.

## نکات فنی

- کوکی‌های سشن (`vodda_token` + `vodda_session`) مستقیماً توسط بک‌اند روی
  دامنهٔ والد `.vodda.ir` ست می‌شوند؛ کاربر به `FRONTEND_BASE_URL + /app/`
  برمی‌گردد و در هر دو دامنه `vodda.ir` و `app.vodda.ir` لاگین است.
- حساب‌های گوگل با ایمیل تأییدشده وارد می‌شوند؛ اگر قبلاً با همان ایمیل حساب
  OTP داشته باشند، دو حساب به هم لینک می‌شوند (فیلدهای `email` و `google_id`
  روی `users`).
- پیامک برای شماره‌های خارجی لازم نیست — همین مسیر برای کاربران خارج از کشور
  طراحی شده است.
