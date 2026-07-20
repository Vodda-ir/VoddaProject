<div dir="rtl">

# مرجع API وُدّا

- Base URL: `/api/v1`
- احراز هویت: `Authorization: Bearer <token>`
- پاسخ موفق: `{ "data": ... }`
- پاسخ لیست: `{ "data": [...], "total": n }`
- پاسخ خطا: `{ "error": "پیام" }`
- timezone کسب‌وکار: مقدار `APP_TIMEZONE`، پیش‌فرض `Asia/Tehran`

## احراز هویت

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/auth/request-otp` | بدنه: `{ "mobile": "09..." }` |
| POST | `/auth/verify-otp` | بدنه: `{ "mobile", "code" }`؛ خروجی token، user و `need_profile` |

در development می‌توان `OTP_TEST_BYPASS_ENABLED=true` و `OTP_TEST_CODE=33365` را فعال کرد. این قابلیت در production توسط validation تنظیمات ممنوع است. اگر `OTP_TEST_MOBILE` خالی باشد، کد development برای همهٔ شماره‌ها معتبر است.

## اساتید عمومی

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/teachers` | فیلترها: `q, field, city, female, limit, offset` |
| GET | `/teachers/:id` | پروفایل، خدمات و نظرات |
| GET | `/teachers/:id/work-times` | زمان‌های کاری با قرارداد `{ id, weekday, from, to, active }` |

قرارداد روز هفته: `0=شنبه` تا `6=جمعه`.

## کاربر احراز هویت‌شده

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/me` | پروفایل جاری |
| PUT | `/me` | ویرایش پروفایل |
| POST | `/me/become-teacher` | ثبت درخواست استاد |
| GET | `/notifications` | اعلان‌ها |
| POST | `/notifications/:id/read` | خوانده‌شدن اعلان |

نمونهٔ ثبت درخواست استاد:

```json
{
  "field": "quran",
  "tag": "مدرس تجوید",
  "bio": "توضیحات سوابق و تخصص",
  "city": "کرمان",
  "price30": 150000,
  "price60": 300000,
  "female": false,
  "skills": ["تجوید", "روان‌خوانی"]
}
```

## جلسات قرآن‌آموز

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/sessions` | رزرو جلسه |
| GET | `/sessions?when=upcoming\|past` | جلسات من |
| POST | `/sessions/:id/cancel` | لغو و refund |
| POST | `/reviews` | امتیازدهی پس از اتمام |

بدنهٔ رزرو:

```json
{
  "teacher_id": 1,
  "service_id": 2,
  "scheduled_at": "2026-07-25T14:30:00Z",
  "note": "یادداشت اختیاری"
}
```

سرور این موارد را کنترل می‌کند:

- استاد approved، verified و available باشد.
- خدمت متعلق به استاد و active باشد.
- زمان حداقل پنج دقیقه در آینده و حداکثر شش ماه بعد باشد.
- جلسه داخل ساعات کاری استاد در `APP_TIMEZONE` قرار بگیرد.
- با جلسهٔ pending/confirmed استاد یا قرآن‌آموز تداخل نداشته باشد.
- موجودی قرآن‌آموز کافی باشد.

## کیف پول

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/wallet/transactions` | دفتر کل کاربر |
| POST | `/wallet/charge` | شارژ مستقیم **فقط برای development** |

`POST /wallet/charge` فقط وقتی اجرا می‌شود که محیط production نباشد و `DEV_WALLET_CHARGE_ENABLED=true` باشد. production باید از callback تأییدشدهٔ درگاه پرداخت استفاده کند؛ درگاه واقعی هنوز جزو کارهای باقی‌مانده است.

نمونهٔ development:

```json
{ "amount": 200000 }
```

## استاد

تمام مسیرهای زیر نقش `teacher` یا `admin` می‌خواهند.

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/teacher/me` | پروفایل استاد جاری |
| PUT | `/teacher/me` | ویرایش پروفایل |
| POST | `/teacher/services` | افزودن خدمت pending |
| PUT | `/teacher/services/:id` | ویرایش خدمت |
| DELETE | `/teacher/services/:id` | حذف خدمت |
| GET | `/teacher/work-times` | زمان‌های کاری |
| PUT | `/teacher/work-times` | جایگزینی مجموعهٔ زمان‌ها؛ `{ slots: [...] }` |
| POST | `/teacher/work-times` | افزودن بازه |
| PUT | `/teacher/work-times/:id` | ویرایش بازه |
| DELETE | `/teacher/work-times/:id` | حذف بازه |
| GET | `/teacher/sessions?when=...` | جلسات استاد |
| POST | `/teacher/sessions/:id/accept` | پذیرش درخواست معتبر |
| POST | `/teacher/sessions/:id/reject` | رد و refund؛ `{ "reason": "..." }` |
| POST | `/teacher/sessions/:id/complete` | اتمام پس از پایان زمان جلسه |
| POST | `/teacher/withdrawals` | درخواست برداشت |
| GET | `/teacher/withdrawals` | برداشت‌های من |

نمونهٔ بازهٔ کاری:

```json
{ "weekday": 0, "from": "09:00", "to": "13:00" }
```

نمونهٔ برداشت:

```json
{
  "amount": 500000,
  "card": "",
  "sheba": "IR000000000000000000000000"
}
```

حداقل یکی از `card` یا `sheba` الزامی است.

## مدیر

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/admin/dashboard` | آمار کلیدی |
| GET | `/admin/users?role=` | کاربران |
| PATCH | `/admin/users/:id/active` | فعال/غیرفعال‌کردن |
| GET | `/admin/teachers?status=` | اساتید |
| POST | `/admin/teachers/:id/review` | `{ "approve": true\|false }` |
| GET | `/admin/sessions?status=` | جلسات |
| GET | `/admin/withdrawals?status=` | برداشت‌ها |
| POST | `/admin/withdrawals/:id/process` | `{ "paid": true\|false }` |
| GET | `/admin/services` | خدمات pending |
| PUT | `/admin/services/:id/approve` | تأیید خدمت |
| PUT | `/admin/services/:id/reject` | رد خدمت |

## وضعیت HTTP متداول

| کد | معنا |
|---:|---|
| 200/201 | موفق |
| 400 | validation نامعتبر |
| 401 | token وجود ندارد یا نامعتبر است |
| 403 | نقش/حساب مجاز نیست یا قابلیت development غیرفعال است |
| 404 | منبع یافت نشد |
| 409 | وضعیت چرخه یا زمان رزرو متعارض است |
| 500/502 | خطای داخلی یا provider بیرونی |

## نمونهٔ چرخهٔ development

```bash
B=http://localhost:3420/api/v1

curl -s -X POST "$B/auth/request-otp" \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"09120000000"}'

TOKEN=$(curl -s -X POST "$B/auth/verify-otp" \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"09120000000","code":"33365"}' | jq -r .data.token)

curl -s "$B/me" -H "Authorization: Bearer $TOKEN"
```

> برای رزرو، استاد باید زمان کاری فعال داشته باشد و کاربر نیز موجودی کافی داشته باشد.

</div>
