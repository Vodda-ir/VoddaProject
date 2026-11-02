# وُدّا Web v2 — نسخه تولیدی (تمیز)

سایت وُدّا روی ریشه `vodda.ir` — طراحی جدید + **اتصال کامل به بک‌اند واقعی (Go API)** بدون هیچ داده جعلی.

## معماری اتصال (۰ تا ۱۰۰)

```
مرورگر ──(same-origin)──▶ nginx (vodda.ir)
                           ├── try_files $uri $uri.html  → صفحات استاتیک web/  (طرح جدید)
                           ├── /uploads/  → vodda_backend (فایل‌های پروفایل)
                           └── بقیه مسیرها → فرانت‌اند قبلی (اپ کاربردی)
صفحات استاتیک ──(fetch هم‌مبأ)──▶ /api/auth/*       → BFF فرانت‌اند قدیمی (کوکی HttpOnly vodda_token)
                 ──(fetch هم‌مبأ)──▶ /api/backend/*   → BFF پروکسی عمومی → Go API /api/v1 (Bearer)
```

- **هویت**: JWT فقط در کوکی HttpOnly (`vodda_token`) که توسط `/api/auth/verify-otp` تنظیم می‌شود — هیچ توکنی در localStorage نیست.
- **API عمومی** (`GET /teachers*`, `POST /support/messages`): بدون نیاز به ورود.
- **API کاربر** (`/me`, `/sessions`, `/wallet/transactions`, ...): با کوکی + Bearer خودکار توسط BFF.

## صفحات واقعی (طرح جدید + داده زنده)

| صفحه | عملکرد |
|---|---|
| `index.html` | لندینگ + کاروسل استادان زنده (`GET /teachers`) |
| `search.html` | جست‌وجوی زنده استادان با فیلتر رشته |
| `teacher.html?id=N` | پروفایل واقعی: خدمات، نظرات، JSON-LD، استادان مرتبط |
| `book.html?teacher=N&service=M&slot=...` | رزرو واقعی: انتخاب خدمت → تقویم زنده (`availability`) → ثبت (`POST /sessions`) با تشخیص ورود و بازگشت پس از لاگین |
| `login.html` / `otp.html` | ورود واقعی OTP (کوکی HttpOnly) با countdown و ارسال مجدد |
| `session.html` | جلسات من (upcoming/past) + لغو با refund |
| `profile.html` | ویرایش نام/شهر/بیو + آپلود آواتار (multipart `PUT /me`) + خروج |
| `orders.html` | موجودی + گردش حساب (`/wallet/transactions`) |
| `credit.html` | شارژ کیف پول — درگاه به‌زودی؛ ثبت درخواست شارژ به پشتیبانی (`/support/messages`) |

## صفحات استاب (بدون داده جعلی)

`ordercenter→/orders` · `payment→/credit` · `specialist→/search` · `store→/credit` · `chat→اپ واقعی` · `panel-admin→/panel/admin` · `panel-teacher→/panel/teacher`

پنل‌های کامل استاد/مدیر و چت زنده در اپ کاربردی Next.js باقی هستند (`/panel/*` روی فرانت‌اند قبلی).

## نکته SMS

خطای ۵۰۰ هنگام ورود = خطای موقت پروایدر پیامک (faraz/ippanel). لاگ بک‌اند: `sms provider failed`. راهکار پایدار: افزودن retry در `backend/internal/platform/sms/sms.go` یا تغییر `SMS_PROVIDER` به sms.ir با کلید معتبر.

## استقرار

```bash
bash deploy.sh web     # فقط سایت استاتیک + nginx (سریع) — یا:
python3 /home/z/data/deploy/deploy_web.py   # معادل paramiko
```
