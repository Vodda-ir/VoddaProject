<div dir="rtl">

# چک‌لیست وضعیت وُدّا

آخرین بازبینی: **۲۰۲۶-۰۸-۲۹**

این فایل فقط وضعیت واقعی کد فعلی را نشان می‌دهد. قابلیت وابسته به سرویس بیرونی تا زمان اتصال و آزمون end-to-end «تکمیل‌شده» محسوب نمی‌شود.

## هستهٔ محصول

- [x] ورود OTP، JWT و کنترل نقش/فعال‌بودن حساب از دیتابیس
- [x] ذخیرهٔ digest کد OTP و جلوگیری از bypass در production
- [x] پروفایل کاربر و استاد و onboarding اتمیک استاد
- [x] بررسی و تأیید/رد استاد و خدمت توسط مدیر
- [x] تعریف و ویرایش برنامهٔ کاری با کنترل ساعت و هم‌پوشانی
- [x] جستجوی استاد تأییدشده با نام، حوزه، شهر، جنسیت و pagination
- [x] availability رزرو authoritative در Backend بر اساس timezone، مدت خدمت، برنامهٔ کاری و تداخل
- [x] مصرف یکسان availability در وب و Flutter و refresh پس از conflict
- [x] ذخیرهٔ UTC و بازگرداندن `local_date/local_start/local_end` رسمی برای همهٔ فهرست‌های جلسه
- [x] رزرو، پذیرش، رد، لغو پیش از شروع، تکمیل و امتیازدهی
- [x] refund و settlement اتمیک و جلوگیری از عملیات تکراری
- [x] endpoint واقعی نظرهای استاد و نمایش آن در پنل

## مالی

- [x] کیف پول و دفتر تراکنش
- [x] debit شرطی، row locking و جلوگیری از موجودی منفی
- [x] رزرو، refund، settlement و برداشت در transactionهای MySQL
- [x] کنترل مبلغ برداشت نسبت به موجودی
- [x] الزام شماره کارت ۱۶ رقمی یا شبا `IR` + ۲۴ رقم در وب و Flutter
- [x] تاریخچه و وضعیت برداشت برای استاد و مدیر
- [x] هشدار صریح که ثبت `paid` جایگزین انتقال بانکی نیست
- [x] حذف شارژ development از UI production
- [ ] زرین‌پال واقعی: request، redirect، callback، verify، idempotency و reconciliation

## وب و UI/UX

- [x] نشست HttpOnly و عبور همهٔ پنل‌ها از BFF
- [x] rewrite مسیرهای legacy `/api/v1` به BFF
- [x] ناوبری موبایل، focus-visible و reduced-motion
- [x] جستجوی debounce‌شده با AbortController، URL state و pagination
- [x] تفکیک loading، empty، error و retry در مسیرهای اصلی
- [x] حذف آمار، نمودار، تماس، شارژ و CTAهای ساختگی
- [x] پنل قرآن‌آموز با زمان رسمی، لغو واقعی و وضعیت مالی
- [x] پنل استاد کامل: داشبورد واقعی، درخواست‌ها، جلسات، خدمات، برنامهٔ کاری، کیف پول، برداشت و نظرها
- [x] جلوگیری از فعال‌سازی خدمت توسط استاد؛ فعال‌سازی فقط در moderation مدیر
- [x] پنل مدیر: کاربران، استادان، خدمات، جلسات، برداشت، پشتیبانی و audit
- [x] جدول‌ها و کارت‌های responsive و عملیات حساس دارای confirmation/busy state
- [x] FAQ، قوانین و حریم خصوصی هماهنگ با قابلیت‌های فعال

## مهاجرت Universal App + Capacitor

- [x] رودمپ اجرایی مهاجرت در [`docs/universal-app-migration-roadmap.md`](docs/universal-app-migration-roadmap.md) ایجاد شد.
- [x] ساختار `frontend/src/universal-app/`، entry مستقل React، routing داخلی و mount مستقل `/app/...` ایجاد شد؛ importهای `next/*` در این لایه با ESLint ممنوع شده‌اند و base path قابل تنظیم است.
- [ ] platform adapter مستقل برای web/native.
- [ ] حفظ HttpOnly/BFF روی وب و secure token/Bearer روی native.
- [ ] shared mobile-first UI kit و app shell.
- [ ] parity کامل learner app با Flutter.
- [ ] parity کامل teacher app با Flutter.
- [ ] route contract مستقل از `/panel/...`.
- [ ] Capacitor/Vite scaffold با `ir.vodda.vodda` و local bundle.
- [ ] آمادگی انتقال از `vodda.ir/app` به `app.vodda.ir` فقط با config/deployment.
- [ ] تکمیل مستندات و حذف duplicate codeهای مهاجرت.

> در scope فعلی، build/test/npm install/Android/iOS generation شرط تکمیل این رودمپ نیست و اجرا نمی‌شود.

## Flutter

- [x] Riverpod، go_router، Dio و secure storage
- [x] guard نقش استاد و learner
- [x] جستجوی server-side با debounce و فیلتر واقعی
- [x] رزرو از availability رسمی Backend
- [x] نمایش زمان جلسه از فیلدهای رسمی Backend، نه timezone دستگاه
- [x] تأیید/رد/لغو/تکمیل/امتیازدهی واقعی با busy و error state
- [x] حذف اعلان، تماس، امتیاز و درآمد ساختگی
- [x] داشبورد استاد با موجودی، امتیاز، نظر و تعداد جلسهٔ واقعی
- [x] خدمات استاد با مدت ۱۰ تا ۲۴۰ دقیقه و policy moderation
- [x] برداشت با مبلغ، کارت/شبا و پیام چرخهٔ واقعی
- [x] Android release بدون keystore production عمداً fail می‌شود
- [x] backup/transfer داده‌های حساس Android غیرفعال است
- [ ] archive/signing و Keychain روی iOS واقعی
- [ ] انتشار نسخهٔ امضاشده در فروشگاه‌ها

## امنیت و عملیات

- [x] rate limit برای OTP، جستجو، mutation، مالی و admin
- [x] request ID، access log، security headers و HSTS
- [x] body limit و اعتبارسنجی آپلود آواتار
- [x] liveness/readiness دیتابیس
- [x] audit log عملیات موفق مدیر
- [x] backup فشرده با checksum و restore محافظت‌شده
- [x] runtime غیر root، `no-new-privileges` و publish پورت production روی localhost
- [ ] migration نسخه‌دار و rollback آزموده‌شده
- [ ] ممیزی و اعمال foreign keyها
- [ ] Redis/shared limiter و object storage برای چند replica
- [ ] metrics، tracing و alerting مرکزی

## کیفیت و اعتبارسنجی

- [x] تست‌های Go برای availability، timezone نمایش و policy لغو
- [x] تست‌های Flutter برای parsing availability و زمان رسمی جلسه
- [x] تست‌های Node برای BFF، صداقت محتوا، پنل استاد، moderation، برداشت و timezone
- [x] workflow شامل Go format/vet/race/build، MySQL integration، Node test/lint/build، Flutter analyze/test و Docker validation است
- [ ] اجرای موفق workflow روی commit نهایی؛ GitHub Actions فعلاً jobها را پیش از checkout با `steps: null` متوقف می‌کند
- [ ] smoke test کامل staging برای نقش‌ها، رزرو، refund، settlement، برداشت و restore
- [ ] E2E مرورگر و اپ روی Backend واقعی staging
- [ ] accessibility audit خودکار و screen reader

## قابلیت‌های بیرونی باقی‌مانده

- [ ] درگاه واقعی زرین‌پال
- [ ] provider واقعی تماس صوتی و lifecycle اتصال
- [ ] انتشار رسمی اپ

جزئیات: [`docs/audit-2026-07-27.md`](docs/audit-2026-07-27.md)

</div>