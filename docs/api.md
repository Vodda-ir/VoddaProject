<div dir="rtl">

# مرجع API وُدّا

- آدرس پایه: `/api/v1`
- احراز هویت: هدر `Authorization: Bearer <token>` (JWT)
- پاسخ موفق: `{ "data": ... }` — لیست‌ها: `{ "data": [...], "total": n }`
- پاسخ خطا: `{ "error": "پیام فارسی" }` با کد وضعیت مناسب

## احراز هویت (عمومی)

| متد | مسیر | توضیح |
| --- | --- | --- |
| POST | `/auth/request-otp` | ارسال کد. بدنه: `{ "mobile": "09..." }` |
| POST | `/auth/verify-otp` | بررسی کد و دریافت توکن. بدنه: `{ "mobile", "code" }` → `{ token, user, need_profile }` |

> در حالت دیباگ (`OTP_TEST_BYPASS_ENABLED=true`) کد `33365` همیشه معتبر است.

## اساتید (عمومی)

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/teachers` | جستجو. کوئری: `q, field, city, female, limit, offset` |
| GET | `/teachers/:id` | پروفایل + نظرات |
| GET | `/teachers/:id/work-times` | زمان‌های کاری |

## کاربر (احراز هویت لازم)

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/me` | پروفایل من |
| PUT | `/me` | ویرایش پروفایل |
| POST | `/me/become-teacher` | ثبت پروفایل استادی (در انتظار تأیید) |
| GET | `/notifications` | نوتیفیکیشن‌ها |
| POST | `/notifications/:id/read` | علامت خوانده‌شده |

### جلسات (قرآن‌آموز)

| متد | مسیر | توضیح |
| --- | --- | --- |
| POST | `/sessions` | رزرو. بدنه: `{ teacher_id, service_id, scheduled_at (RFC3339), note }` |
| GET | `/sessions?when=upcoming\|past` | لیست جلسات من |
| POST | `/sessions/:id/cancel` | لغو + بازگشت وجه |
| POST | `/reviews` | امتیازدهی. بدنه: `{ session_id, rating(1-5), text }` |

### کیف پول

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/wallet/transactions` | دفتر کل تراکنش‌ها |
| POST | `/wallet/charge` | شارژ. بدنه: `{ amount }` (در تولید از callback درگاه فراخوانی می‌شود) |

## استاد (نقش teacher)

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/teacher/me` | پروفایل استادی من |
| PUT | `/teacher/me` | ویرایش پروفایل استادی |
| POST | `/teacher/services` | افزودن خدمت |
| PUT | `/teacher/services/:id` | ویرایش خدمت |
| DELETE | `/teacher/services/:id` | حذف خدمت |
| PUT | `/teacher/work-times` | تنظیم زمان‌های کاری. بدنه: `{ slots: [{ weekday, from, to }] }` |
| GET | `/teacher/work-times` | دریافت زمان‌های کاری من |
| POST | `/teacher/work-times` | افزودن یک بازه. بدنه: `{ weekday, from, to }` |
| PUT | `/teacher/work-times/:id` | ویرایش یک بازه. بدنه: `{ weekday, from, to }` |
| DELETE | `/teacher/work-times/:id` | حذف یک بازه |
| GET | `/teacher/sessions?when=...` | جلسات استاد |
| POST | `/teacher/sessions/:id/accept` | پذیرش درخواست |
| POST | `/teacher/sessions/:id/reject` | رد درخواست (بازگشت وجه). بدنه: `{ reason }` |
| POST | `/teacher/sessions/:id/complete` | اتمام جلسه (واریز درآمد) |
| POST | `/teacher/withdrawals` | درخواست برداشت. بدنه: `{ amount, card, sheba }` |
| GET | `/teacher/withdrawals` | لیست برداشت‌های من |

## ادمین (نقش admin)

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/admin/dashboard` | آمار کلی |
| GET | `/admin/users?role=` | لیست کاربران |
| PATCH | `/admin/users/:id/active` | فعال/غیرفعال. بدنه: `{ active }` |
| GET | `/admin/teachers?status=` | لیست اساتید |
| POST | `/admin/teachers/:id/review` | تأیید/رد. بدنه: `{ approve }` |
| GET | `/admin/sessions?status=` | لیست جلسات |
| GET | `/admin/withdrawals?status=` | لیست برداشت‌ها |
| POST | `/admin/withdrawals/:id/process` | پرداخت/رد برداشت. بدنه: `{ paid }` |

## نمونهٔ چرخهٔ کامل (cURL)

```bash
B=http://localhost:3420/api/v1
TOKEN=$(curl -s -X POST $B/auth/verify-otp -d '{"mobile":"09120000000","code":"33365"}' | jq -r .data.token)
curl -s $B/me -H "Authorization: Bearer $TOKEN"
curl -s -X POST $B/wallet/charge -H "Authorization: Bearer $TOKEN" -d '{"amount":200000}'
curl -s -X POST $B/sessions -H "Authorization: Bearer $TOKEN" \
  -d '{"teacher_id":1,"service_id":1,"scheduled_at":"2026-07-10T18:00:00Z"}'
```

</div>
