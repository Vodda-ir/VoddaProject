# تنظیمات پیامک تأیید وُدّا

Backend برای ارسال OTP از Faraz SMS استفاده می‌کند. قرارداد فعلی از پیاده‌سازی قدیمی Laravel گرفته شده است:

- endpoint: `https://ippanel.com/patterns/pattern`
- شمارهٔ فرستنده: `3000505`
- شناسهٔ الگوی تأیید: `j4skcu7fjd1jjjz`
- نام پارامتر الگو: `code`

نام کاربری و گذرواژه باید فقط در `.env.production` و به‌صورت secret تنظیم شوند:

```dotenv
SMS_PROVIDER=faraz
SMS_FARAZ_USERNAME=...
SMS_FARAZ_PASSWORD=...
SMS_FARAZ_FROM=3000505
SMS_FARAZ_PATTERN_CODE=j4skcu7fjd1jjjz
```

فایل‌های `.env.production` و `deploy.json` محرمانه‌اند و نباید در Git ثبت شوند. کد OTP از سمت Backend تولید و اعتبارسنجی می‌شود؛ کلید یا گذرواژهٔ سرویس پیامک در اپ وب یا موبایل قرار نمی‌گیرد.

برای توسعهٔ محلی، اگر اعتبارنامهٔ provider تنظیم نشده باشد، Backend از فرستندهٔ log-only استفاده می‌کند. در production، تنظیم نام کاربری و گذرواژهٔ فراز الزامی است.
