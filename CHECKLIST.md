# چک‌لیست ساخت پروژه وُدّا (Vodda)

> این فایل وضعیت پیشرفت پروژه را نشان می‌دهد. هر کاری که انجام می‌شود اینجا ثبت می‌گردد.
> علامت‌ها: ✅ انجام شد · 🚧 در حال انجام · ⬜ باقی‌مانده

**معماری:** Flutter (clean + Riverpod + go_router) · Go (clean + Gin + GORM + MySQL) · Next.js + TypeScript
**پورت‌ها:** backend `3420` · frontend `3421` · mysql `3422`

---

## فاز ۰ — راه‌اندازی اولیه
- ✅ بررسی طراحی‌ها (اپ کاربر، وبسایت، پنل‌ها) و استخراج design system
- ✅ ذخیره‌ی طراحی‌ها در `docs/design/`
- ✅ ساختار ریشه، فایل‌های env (`.env.example/.local/.production`)، gitignore
- ✅ مستندسازی design tokens در `docs/design-system.md`

## فاز ۱ — اسکلت سه اپ
- ✅ اسکلت backend (Go modules + ساختار clean architecture)
- ✅ اسکلت frontend (Next.js + TypeScript + Tailwind + توکن‌های Vodda)
- ✅ اسکلت اپ Flutter (clean architecture + Riverpod + go_router + تم)

## فاز ۲ — زیرساخت Docker و دیپلوی
- ✅ `backend/Dockerfile` + `Dockerfile.dev` (+ `.air.toml`)
- ✅ `frontend/Dockerfile` (standalone) + `Dockerfile.dev`
- ✅ `docker-compose.yml` / `docker-compose.debug.yml` / `docker-compose.deploy.yml`
- ✅ `docker-debug.sh` (تست محلی)
- ✅ `docker-deploy.sh` (دیپلوی روی سرور)
- ✅ `deploy.example.json`

## فاز ۳ — بک‌اند Go (✅ کامل و تست‌شدهٔ end-to-end)
- ✅ config، اتصال DB (retry)، AutoMigrate، seed
- ✅ مدل‌ها: User, Teacher, Service, Sample, WorkTime, Session, Review, Transaction, Withdrawal, OTP, Notification
- ✅ احراز هویت: OTP پیامکی (sms.ir + stub) + JWT + bypass دیباگ
- ✅ تنظیم سرویس پیامک sms.ir: قالب ۲۴۶۲۵۶ / پارامتر VERIFICATIONCODE / ادمین seed با شمارهٔ 09136336002 / کد پیشفرض لوکال 33365
- ✅ API کاربران و پروفایل + become-teacher
- ✅ API اساتید (لیست، جستجو، پروفایل)
- ✅ API خدمات و زمان‌های کاری استاد
- ✅ API رزرو و چرخهٔ جلسه (درخواست/پذیرش/رد/لغو/اتمام)
- ✅ API کیف پول و تراکنش‌ها (شارژ، escrow، کارمزد ۱۵٪)
- ✅ API برداشت وجه استاد + پردازش ادمین
- ✅ API نظرات و امتیازدهی (+ به‌روزرسانی میانگین)
- ✅ API ادمین (داشبورد، کاربران، اساتید، جلسات، تراکنش‌ها، برداشت‌ها)
- ✅ middleware (auth, role/RBAC, CORS, logging) + تست دستی end-to-end
- ⬜ تست‌های واحد Go (در فاز بعد)
- ⬜ اتصال واقعی درگاه پرداخت زرین‌پال (اسکلت آماده)

## فاز ۴ — فرانت‌اند Next.js
- ✅ design system مشترک (Tailwind tokens، فونت، RTL)
- ✅ کلاینت API (`lib/api.ts`) + پراکسی `/api/v1`
- ✅ وبسایت عمومی: Nav, Hero, Categories, HowItWorks, FeaturedTeachers, BecomeTeacher, Footer (اتصال به API اساتید)
- ✅ اسکلت پنل کاربر (داشبورد + ناوبری ۶ بخش)
- ✅ اسکلت پنل استاد (داشبورد + ناوبری ۷ بخش)
- ✅ اسکلت پنل ادمین (داشبورد + ناوبری ۸ بخش)
- ⬜ اتصال کامل پنل‌ها به API (ورود، جداول داده، اکشن‌ها)
- ⬜ بخش‌های باقی‌ماندهٔ وبسایت (WhyVodda، Testimonials، DownloadApp کامل)

## فاز ۵ — اپ Flutter
- ✅ تم و توکن‌ها، RTL، فارسی‌سازی اعداد
- ✅ شبکه (Dio + interceptor توکن)، ذخیرهٔ توکن، providerها
- ✅ مسیریابی go_router با redirect احراز هویت
- ✅ ورود/OTP
- ✅ کامپوننت مشترک TeacherCard + بقیهٔ shell
- ✅ نقش قرآن‌آموز: خانه، جستجو، پروفایل استاد (متصل به API)
- 🚧 صفحات placeholder: جلسات، کیف پول، پروفایل (در حال تکمیل)
- ⬜ جریان رزرو ۴ مرحله‌ای، امتیازدهی، کیف پول کامل
- ⬜ نقش استاد (داشبورد، درخواست‌ها، جلسات، خدمات، زمان‌های کاری، برداشت) + سوییچ نقش

## فاز ۶ — نهایی‌سازی
- ✅ README کامل
- ✅ مستندات `docs/` (architecture، api، deployment، design-system)
- ⬜ تست‌های خودکار (Go unit + Flutter widget + e2e)

---

## وضعیت اعتبارسنجی (آخرین اجرا)
- ✅ `backend`: `go build ./...` و `go vet ./...` بدون خطا
- ✅ `backend`: اجرای واقعی روی MySQL — health، اساتید (seed)، OTP، چرخهٔ کامل رزرو→پذیرش→اتمام→امتیاز، کیف پول و کارمزد، RBAC ادمین
- ✅ `frontend`: `npm run build` موفق (لندینگ + ۳ پنل)
- ✅ `app`: `flutter analyze` بدون مشکل + تست‌ها سبز
