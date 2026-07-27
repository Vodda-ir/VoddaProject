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

در development می‌توان `OTP_TEST_BYPASS_ENABLED=true` و `OTP_TEST_CODE=33365` را فعال کرد. این قابلیت در production توسط validation تنظیمات ممنوع است.

## استادان عمومی

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/teachers` | جستجوی استادان فعال و تأییدشده؛ پارامترهای `q`، `field`، `city`، `female`، `limit` و `offset` |
| GET | `/teachers/:id` | پروفایل عمومی، خدمات فعال و نظرها |
| GET | `/teachers/:id/work-times` | بازه‌های کاری عمومی استاد؛ برای نمایش برنامه، نه تولید مستقل slot در کلاینت |
| GET | `/teachers/:id/availability` | زمان‌های قابل رزرو authoritative با `service_id` اجباری و `days` اختیاری ۱ تا ۶۰ |

### قرارداد availability

نمونه:

```json
{
  "data": [
    {
      "start_at": "2026-07-27T05:30:00Z",
      "end_at": "2026-07-27T06:00:00Z",
      "local_date": "2026-07-27",
      "local_start": "09:00",
      "local_end": "09:30",
      "weekday": 2
    }
  ]
}
```

قواعد:

- `start_at` و `end_at` UTC و مقدار معتبر برای `scheduled_at` رزرو هستند.
- `local_*` بر اساس `APP_TIMEZONE` ساخته می‌شوند تا دستگاهی با timezone دیگر همان ساعت رسمی سامانه را نمایش دهد.
- Backend بازهٔ کاری را بر اساس مدت خدمت تقسیم می‌کند.
- زمان گذشته، slot ناقص و تداخل با جلسهٔ pending/confirmed حذف می‌شوند.
- availability رزرو قطعی نیست؛ درخواست همزمان دیگر ممکن است قبل از submit همان زمان را بگیرد و endpoint رزرو در این حالت conflict برمی‌گرداند.
- وب و Flutter نباید از `/work-times` الگوریتم مستقل slot generation بسازند.

## حساب و پروفایل

همهٔ مسیرهای این بخش نیازمند JWT هستند.

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/me` | پروفایل و نقش جاری از دیتابیس |
| PUT | `/me` | ویرایش پروفایل؛ `multipart/form-data` برای avatar پشتیبانی می‌شود |
| POST | `/me/become-teacher` | ایجاد اتمیک پروفایل استاد و تغییر نقش |
| GET | `/notifications` | اعلان‌های کاربر |
| POST | `/notifications/:id/read` | خوانده‌شدن اعلان متعلق به کاربر |

## جلسات قرآن‌آموز

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/sessions` | رزرو با `{ teacher_id, service_id, scheduled_at, note? }`؛ `scheduled_at` باید `start_at` availability باشد |
| GET | `/sessions?when=upcoming|past` | جلسات کاربر |
| POST | `/sessions/:id/cancel` | لغو فقط توسط مالک، در وضعیت pending/confirmed و پیش از زمان شروع؛ refund اتمیک |
| POST | `/reviews` | امتیاز یک‌باره پس از جلسهٔ تکمیل‌شده |

رزرو همچنان همهٔ قواعد availability را دوباره داخل transaction بررسی می‌کند؛ نتیجهٔ availability جایگزین validation زمان submit نیست.

## کیف پول

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/wallet/transactions` | دفتر تراکنش کاربر |
| POST | `/wallet/charge` | شارژ مستقیم فقط در development و در production غیرفعال |

درگاه واقعی زرین‌پال هنوز endpoint عمومی production ندارد.

## پنل استاد

نیازمند نقش `teacher` یا `admin`:

| متد | مسیر | توضیح |
|---|---|---|
| GET/PUT | `/teacher/me` | مشاهده/ویرایش پروفایل استاد |
| POST | `/teacher/services` | خدمت جدید؛ غیرفعال تا moderation |
| PUT/DELETE | `/teacher/services/:id` | ویرایش یا حذف خدمت متعلق به استاد |
| GET/PUT | `/teacher/work-times` | مشاهده یا جایگزینی کامل برنامهٔ کاری |
| POST | `/teacher/work-times` | افزودن بازه |
| PUT/DELETE | `/teacher/work-times/:id` | ویرایش یا حذف بازهٔ متعلق به استاد |
| GET | `/teacher/sessions?when=...` | جلسات استاد |
| POST | `/teacher/sessions/:id/accept` | تأیید جلسهٔ pending معتبر |
| POST | `/teacher/sessions/:id/reject` | رد و refund اتمیک |
| POST | `/teacher/sessions/:id/complete` | تکمیل بعد از پایان زمان و settlement اتمیک |
| GET/POST | `/teacher/withdrawals` | مشاهده و ثبت درخواست برداشت |

## مدیریت

نیازمند نقش جاری `admin`:

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/admin/dashboard` | آمار واقعی کاربران، استادان، جلسات و مالی |
| GET | `/admin/users` | فهرست صفحه‌بندی‌شده کاربران |
| PATCH | `/admin/users/:id/active` | فعال/غیرفعال‌کردن با boolean صریح |
| GET | `/admin/teachers` | فهرست با فیلتر status |
| POST | `/admin/teachers/:id/review` | `{ "approve": true|false }` |
| GET | `/admin/services` | خدمات در انتظار moderation |
| PUT | `/admin/services/:id/approve` | انتشار خدمت |
| PUT | `/admin/services/:id/reject` | رد و حذف خدمت |
| GET | `/admin/sessions` | گزارش جلسات |
| GET | `/admin/withdrawals` | درخواست‌های برداشت |
| POST | `/admin/withdrawals/:id/process` | `{ "action": "paid"|"rejected" }` |
| GET | `/admin/support/messages` | پیام‌های پشتیبانی با status و pagination |
| PATCH | `/admin/support/messages/:id/resolve` | ثبت رسیدگی |
| GET | `/admin/audit-logs` | گزارش actor/action/target/request ID |

mutationهای موفق ادمین در audit log ثبت می‌شوند. ثبت `paid` برای برداشت فقط وضعیت داخلی است و جایگزین انتقال بانکی واقعی نیست.

## پشتیبانی عمومی

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/support/messages` | ثبت rate-limited پیام با `name`، `contact` و `message` |

## پاسخ خطا و request ID

- header ورودی/خروجی: `X-Request-ID`
- خطاهای validation: HTTP 400
- احراز هویت: HTTP 401
- مجوز: HTTP 403
- عدم وجود: HTTP 404
- conflict مانند رزرو همزمان یا لغو بعد از شروع: HTTP 409
- rate limit: HTTP 429 همراه `Retry-After`

</div>
