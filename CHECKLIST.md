<div dir="rtl">

# چک‌لیست وضعیت وُدّا

آخرین بازبینی: **۲۰۲۶-۰۷-۲۷**

این فایل فقط وضعیت واقعی کد فعلی را نشان می‌دهد. قابلیت‌های وابسته به سرویس بیرونی تا زمانی که اتصال و آزمون end-to-end نشده‌اند، «تکمیل‌شده» محسوب نمی‌شوند.

## هستهٔ محصول

- [x] ورود OTP و صدور JWT
- [x] ذخیرهٔ digest کد OTP به‌جای متن خام، همراه با سازگاری موقت با رکوردهای قدیمی
- [x] بررسی فعال‌بودن و نقش جاری کاربر از دیتابیس در هر درخواست محافظت‌شده
- [x] پروفایل کاربر و استاد
- [x] ثبت درخواست استادی به‌صورت اتمیک همراه با تغییر نقش
- [x] بررسی و تأیید/رد استاد توسط ادمین
- [x] تعریف، ویرایش، حذف و تأیید خدمات استاد
- [x] تعریف ساعات کاری با اعتبارسنجی روز، ساعت و هم‌پوشانی
- [x] جستجوی عمومی فقط میان استادان فعال، تأییدشده، verified و available
- [x] جستجوی وب با debounce، لغو درخواست قبلی، total واقعی و pagination
- [x] جستجوی Flutter با فیلتر واقعی نام، حوزه، شهر و جنسیت در Backend
- [x] رزرو بر اساس slotهای واقعی برنامهٔ کاری و مدت خدمت در وب و Flutter
- [x] حذف زمان‌های گذشته و slotهایی که از انتهای بازه عبور می‌کنند
- [x] پذیرش، رد، لغو و تکمیل جلسه
- [x] محدودکردن لغو قرآن‌آموز به پیش از زمان شروع و بازگشت اتمیک وجه
- [x] امتیازدهی یک‌باره پس از جلسه، به‌صورت اتمیک با aggregate استاد
- [x] اعلان درون‌برنامه‌ای برای رویدادهای اصلی

## مالی

- [x] کیف پول و دفتر تراکنش
- [x] debit شرطی و row locking برای جلوگیری از موجودی منفی
- [x] رزرو، refund، settlement و برداشت در transactionهای MySQL
- [x] جلوگیری از اجرای تکراری refund، settlement و پردازش برداشت
- [x] تطبیق gross earning، commission و موجودی استاد
- [x] تست MySQL و concurrency برای عملیات مالی
- [x] شارژ مستقیم توسعه‌ای فقط خارج از production
- [x] حذف دکمه‌های شارژ development از UI production
- [x] هشدار صریح ادمین که ثبت پرداخت برداشت جایگزین انتقال بانکی نیست
- [ ] اتصال واقعی زرین‌پال: request، redirect، callback، verify، idempotency و reconciliation

## وب و تجربهٔ عمومی

- [x] نشست وب با cookie امن HttpOnly و BFF
- [x] عبور همهٔ مسیرهای legacy پنل از BFF برای جلوگیری از 404 و نشت JWT
- [x] بررسی نقش واقعی پنل‌ها از Backend
- [x] ناوبری قابل استفاده در موبایل و focus-visible برای صفحه‌کلید
- [x] جستجوی هیرو با انتقال واقعی query و city
- [x] فیلترهای وب منطبق با مقدارهای واقعی Backend
- [x] حذف fallback استاد، آمار، testimonial، follower، تماس صوتی و لینک دانلود ساختگی
- [x] حذف نمودار و time-series ساختگی داشبورد ادمین
- [x] نمایش شفاف وضعیت loading، empty، error و retry در مسیرهای اصلی
- [x] فرم تماس واقعی با ذخیره در دیتابیس
- [x] صندوق پیام‌های پشتیبانی و ثبت رسیدگی در پنل ادمین
- [x] صفحهٔ audit log عملیات مدیر
- [x] هماهنگی FAQ، قوانین و حریم خصوصی با قابلیت‌های فعال Backend
- [x] تست رگرسیون برای BFF، محتوای عمومی، policy لغو و slotهای رزرو

## اپ Flutter

- [x] Riverpod، go_router و Dio
- [x] نگهداری JWT در platform secure storage؛ عدم ذخیره در SharedPreferences
- [x] مسیریابی بر اساس نقش واقعی ذخیره‌شده در نشست
- [x] جلوگیری از ورود learner به پوستهٔ استاد از مسیر مستقیم
- [x] حذف follow، شمارنده، اعلان، شارژ و تماس صوتی نمایشی
- [x] لغو واقعی جلسه و ثبت واقعی امتیاز
- [x] تولید slot رزرو بر اساس مدت خدمت، امروز و ۱۴ روز آینده
- [x] جستجوی server-side با debounce، فیلتر و retry
- [x] غیرفعال‌بودن رزرو در صورت نبود خدمت تأییدشده
- [x] الزام keystore واقعی برای Android release و جلوگیری از امضای debug
- [x] غیرفعال‌سازی backup/transfer داده‌های حساس Android
- [ ] بررسی release signing، Keychain و build archive روی iOS واقعی
- [ ] انتشار نسخهٔ امضاشده در فروشگاه‌های هدف

## مدیریت و عملیات روزمره

- [x] داشبورد ادمین با آمار واقعی Backend
- [x] مدیریت کاربران با confirmation، busy state و pagination
- [x] moderation استاد و خدمت با بررسی پاسخ API
- [x] گزارش responsive جلسات
- [x] پردازش برداشت با هشدار عملیاتی و ثبت وضعیت
- [x] مشاهدهٔ پیام‌های پشتیبانی و audit بدون ابزار بیرونی
- [x] جدول‌های مدیریت دارای scroll افقی امن در نمایشگر کوچک

## امنیت و عملیات

- [x] rate limit برای OTP، public search، mutation، مالی و admin
- [x] request ID، access log ساختاریافته، security headers و HSTS
- [x] body limit و اعتبارسنجی MIME/پسوند/حجم آواتار
- [x] liveness و readiness واقعی دیتابیس
- [x] audit log برای mutationهای موفق ادمین
- [x] backup فشرده با checksum و restore محافظت‌شده
- [x] پورت‌های production فقط روی localhost
- [x] Docker runtime غیر root و `no-new-privileges`
- [ ] جایگزینی AutoMigrate با migrationهای نسخه‌دار و آزمون rollback
- [ ] تعریف و اعمال foreign keyهای دیتابیس پس از migration audit
- [ ] Redis یا limiter مشترک برای استقرار چند replica
- [ ] object storage مشترک برای upload در استقرار چند replica
- [ ] observability مرکزی: metrics، tracing و alerting

## کیفیت

- [x] `gofmt`، `go vet`، race test و build در workflow
- [x] integration test MySQL برای مالی، onboarding و review
- [x] unit test policy لغو و validation شناسهٔ route
- [x] تست slotهای رزرو در Node و Flutter
- [x] `npm test`، ESLint و Next build در workflow
- [x] Flutter lockfile اجباری، analyze و test در workflow
- [x] seed توسعه‌ای تراکنشی و بدون aggregate ساختگی
- [ ] رفع مانع اجرایی GitHub Actions که jobها را پیش از اولین step متوقف می‌کند
- [ ] smoke test کامل روی staging با سناریوهای نقش، رزرو، refund، settlement و restore
- [ ] تست E2E مرورگر و اپ روی Backend واقعی staging
- [ ] تست accessibility خودکار و مرور دستی با screen reader

## قابلیت‌های بیرونی که هنوز پیاده نشده‌اند

- [ ] درگاه پرداخت واقعی زرین‌پال
- [ ] provider واقعی تماس صوتی و token lifecycle
- [ ] انتشار رسمی اپ

جزئیات ممیزی جدید: [`docs/audit-2026-07-27.md`](docs/audit-2026-07-27.md)

</div>
