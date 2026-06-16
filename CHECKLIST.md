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

## فاز ۴ — فرانت‌اند Next.js (✅ مطابق طرح بازنویسی شد)
- ✅ design system کامل: توکن‌های styles.css + کامپوننت‌های Icon/Avatar/Stars/GeoPattern/WebBtn، responsive RTL
- ✅ کلاینت API (`lib/api.ts`) + پراکسی `/api/v1` + خروجی skills از بک‌اند
- ✅ وبسایت عمومی **عیناً مطابق طرح**: Nav, Hero (سرچ+کارت‌های شناور), Categories, HowItWorks, FeaturedTeachers, WhyVodda, Testimonials, BecomeTeacher, DownloadApp, Footer
- ✅ پنل‌ها **مطابق طرح** (سایدبار تیره، topbar، StatCard، MiniBars، Panel، StatusTag): کاربر، استاد، ادمین با داشبورد کامل
- ⬜ اتصال کامل بخش‌های فرعی پنل‌ها به API (جداول/اکشن‌ها) + ورود واقعی پنل

## فاز ۵ — اپ Flutter (✅ حلقهٔ کامل قرآن‌آموز)
- ✅ تم و توکن‌ها، RTL، فارسی‌سازی اعداد، localization فارسی
- ✅ شبکه (Dio + interceptor توکن)، ذخیرهٔ توکن، providerها، meProvider
- ✅ مسیریابی go_router با redirect احراز هویت
- ✅ ورود/OTP
- ✅ خانه، جستجو، پروفایل استاد (متصل به API)
- ✅ **جلسات من** (تب پیش‌رو/برگزارشده، کارت با StatusPill، لغو) — متصل به API
- ✅ **کیف پول** (کارت موجودی، شارژ سریع، تراکنش‌ها) — متصل به API
- ✅ **پروفایل** (کارت کاربر، سوییچ به حساب استاد، منو، خروج) — متصل به API
- ✅ **رزرو جلسه ۴ مرحله‌ای** (خدمت → تاریخ/ساعت → تأیید → موفق) — متصل به API
- ✅ **امتیازدهی** (bottom sheet ستاره‌ای) — متصل به API
- ✅ **اصلاح آواتار پیشفرض** — جایگزینی CircleAvatar با VoddaAvatar با پترن هندسی زیتونی (بدون رنگ آبی)
- ✅ **بازطراحی صفحه لاگین** — فیلد موبایل بهبودیافته + Pinput برای کد OTP با تم Vodda + انیمیشن collapse + غیرفعال شدن شماره
- ✅ **اصلاح دکمه بک رزرو** — تغییر جهت فلش (Icons.arrow_back به‌جای Icons.arrow_forward) برای RTL
- ✅ **دکمه بک پروفایل استاد** — اضافه شدن leading back button
- ✅ **پنل استاد کامل**: TeacherShell + داشبورد (MiniBars, StatCard) + درخواست‌ها (پذیرش/رد با اسنک‌بار) + جلسات استاد (تب فعال/گذشته، StatusPill) + کیف پول استاد + خدمات (افزودن/ویرایش/حذف/تغییر وضعیت فعال و pending + رفع باگ pending) + زمان‌های کاری (time picker + جلوگیری از تداخل + هشدار تغییرات ذخیره‌نشده + پیام موفقیت) + برداشت (مبلغ/شبا) + پروفایل استاد (ویرایش tag، آواتار، city، bio) + RoleSheet سوییچ نقش

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
