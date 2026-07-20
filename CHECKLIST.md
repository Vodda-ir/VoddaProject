# چک‌لیست پروژه وُدّا

> وضعیت بازبینی‌شده در ۲۰۲۶-۰۷-۲۰. علامت‌ها: ✅ انجام‌شده · 🚧 ناقص/نیازمند تکمیل · ⬜ شروع‌نشده

## زیرساخت و معماری

- ✅ Monorepo شامل Go backend، Next.js frontend و Flutter app
- ✅ Dockerfile و composeهای development/deploy
- ✅ تنظیمات نمونه و تفکیک environment
- ✅ health check و graceful shutdown
- ✅ CI برای Go، Next.js و Flutter
- ✅ اعتبارسنجی تنظیمات production و CORS allow-list
- 🚧 monitoring، metrics، request ID و error tracking
- 🚧 backup/restore و runbook بازیابی

## احراز هویت و امنیت

- ✅ OTP، JWT و RBAC سرور
- ✅ اتصال sms.ir با timeout و برگشت خطای واقعی
- ✅ OTP bypass فقط برای development و ممنوع در production
- ✅ جلوگیری از ورود کاربر غیرفعال
- ✅ حذف secret پیامک از مقدار پیش‌فرض کد
- 🚧 rotate کردن کلید پیامکی که قبلاً در تاریخچهٔ Git قرار گرفته است
- 🚧 انتقال session وب از localStorage/cookie قابل‌خواندن با JS به HttpOnly/BFF
- 🚧 rate limit توزیع‌شده برای OTP و endpointهای حساس
- 🚧 secret scanning و dependency/security scanning

## کاربران و اساتید

- ✅ پروفایل کاربر و ویرایش اطلاعات
- ✅ ثبت درخواست استاد با داده‌های کامل موردنیاز backend
- ✅ تأیید/رد استاد توسط مدیر
- ✅ خدمات استاد و moderation خدمت
- ✅ CRUD زمان‌های کاری
- ✅ اصلاح مقصد اعلان تأیید/رد خدمت
- 🚧 اعتبارسنجی و ذخیره‌سازی امن avatar/audio در object storage
- ⬜ follow/favorite کامل در database، backend، web و Flutter

## رزرو و جلسه

- ✅ انتخاب استاد و خدمت فعال
- ✅ رزرو با زمان آینده
- ✅ کنترل timezone و ساعات کاری استاد
- ✅ جلوگیری از تداخل جلسهٔ استاد و قرآن‌آموز
- ✅ پذیرش، رد، لغو و اتمام جلسه
- ✅ جلوگیری از پذیرش درخواست منقضی و اتمام زودهنگام
- ✅ refund و settlement با مسیرهای جبران خطا
- 🚧 transaction اتمیک دیتابیس برای رزرو/refund/settlement
- 🚧 idempotency برای retry و callback
- ⬜ تماس صوتی واقعی، token، reconnect و گزارش مدت جلسه

## کیف پول و پرداخت

- ✅ ledger تراکنش‌ها و موجودی
- ✅ escrow رزرو، درآمد استاد و کارمزد
- ✅ درخواست برداشت و پردازش مدیر
- ✅ شارژ مستقیم فقط در development و مسدود در production
- 🚧 transaction اتمیک برای balance و ledger
- ⬜ request/callback/verify واقعی زرین‌پال
- ⬜ مدیریت callback تکراری، failed payment و reconciliation

## وب Next.js

- ✅ لندینگ، جستجوی استاد و صفحات عمومی
- ✅ پنل کاربر، استاد و مدیر
- ✅ ورود OTP و خروج
- ✅ رزرو با قرارداد صحیح `from/to` و محاسبهٔ درست روز هفته
- ✅ ثبت‌نام استاد با validation و payload کامل
- ✅ layout موبایل اصلاح‌شده برای هر سه پنل
- ✅ نمایش پنل‌های قابل دسترس بر اساس role
- ✅ فرم تماس بدون موفقیت یا اطلاعات ساختگی
- 🚧 session امن HttpOnly و کنترل role در لایهٔ وب
- 🚧 backend واقعی تماس/تیکت به‌جای mailto
- 🚧 test runner و تست component/integration رسمی
- 🚧 accessibility و تست دستگاه واقعی

## اپ Flutter

- ✅ Riverpod و go_router
- ✅ ورود OTP، خانه، جستجو و پروفایل استاد
- ✅ رزرو، جلسات، کیف پول و امتیازدهی
- ✅ پنل استاد، خدمات، زمان کاری و برداشت
- ✅ مدیریت خطا و pull-to-refresh در صفحات اصلی
- 🚧 حذف/غیرفعال‌سازی UIهایی که backend واقعی ندارند، از جمله follow و تماس صوتی
- 🚧 widget test و integration/e2e گسترده
- 🚧 تست background/reconnect برای جلسهٔ واقعی پس از انتخاب provider

## مدیریت و گزارش

- ✅ آمار کاربران، اساتید، جلسات و کارمزد
- ✅ moderation استاد و خدمت
- ✅ پردازش برداشت
- ✅ جلوگیری از آمار صفر جعلی هنگام خطای repository
- 🚧 audit log عملیات مدیر
- 🚧 export/reporting و reconciliation مالی

## کنترل کیفیت

- ✅ Workflow پایه در `.github/workflows/ci.yml`
- ✅ Go: format، vet، test و build در CI
- ✅ Next.js: build در CI
- ✅ Flutter: analyze و test در CI
- 🚧 افزایش پوشش Go unit و integration با MySQL
- 🚧 افزودن frontend tests اجراشدنی
- 🚧 Flutter widget و end-to-end tests
- 🚧 smoke test خودکار روی staging

## موانع انتشار عمومی

1. ⬜ درگاه زرین‌پال واقعی و idempotent
2. ⬜ transactionهای اتمیک مالی
3. ⬜ تماس صوتی واقعی
4. ⬜ rotate کردن secret لو‌رفته در تاریخچه
5. ⬜ session امن وب و rate limiting
6. ⬜ پوشش تست و staging smoke test
7. ⬜ backup/restore و observability

جزئیات و اولویت‌ها: [`docs/audit-2026-07-20.md`](docs/audit-2026-07-20.md)
