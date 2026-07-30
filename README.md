<div dir="rtl">

# وُدّا (Vodda)

**همراه یادگیری قرآن و مداحی** — پلتفرمی برای یافتن استاد، رزرو جلسه، مدیریت کیف پول و پیگیری چرخهٔ جلسه میان قرآن‌آموز و استاد.

## وضعیت فعلی

هستهٔ محصول برای استقرار تک‌نمونه‌ای پیاده شده است:

- OTP، JWT و کنترل نقش/فعال‌بودن حساب از دیتابیس
- پروفایل، onboarding و moderation استاد و خدمت
- جستجوی عمومی با فیلتر server-side و pagination
- availability رزرو در Backend بر اساس `APP_TIMEZONE`، مدت خدمت، برنامهٔ کاری و تداخل
- نگهداری UTC برای منطق و فیلدهای رسمی `local_date/local_start/local_end` برای نمایش یکسان وب و اپ
- رزرو، پذیرش، رد، لغو پیش از شروع، تکمیل و امتیازدهی
- کیف پول، refund، settlement و برداشت اتمیک
- پنل کامل قرآن‌آموز، استاد و مدیر در وب
- اپ Flutter با جستجو، رزرو، جلسه، خدمات و برداشت واقعی
- پشتیبانی ذخیره‌شونده و audit log عملیات مدیر
- نشست وب HttpOnly/BFF و token اپ در secure storage
- Docker، readiness، backup/restore و workflow کنترل کیفیت چندلایه

درگاه واقعی زرین‌پال و تماس صوتی واقعی هنوز تکمیل نشده‌اند و در UI production به‌عنوان قابلیت فعال نمایش داده نمی‌شوند.

## ساختار مخزن

```text
VoddaProject/
├── backend/                  # Go + Gin + GORM + MySQL
├── frontend/                 # Next.js App Router + TypeScript
├── app/                      # Flutter + Riverpod + go_router + Dio
├── docs/                     # معماری، API، ممیزی و runbook
├── ops/                      # backup/restore
├── docker-compose.yml        # توسعه
└── docker-compose.deploy.yml # production
```

## اجرای محلی

```bash
cp .env.example .env
# مقادیر توسعه را تنظیم کنید
docker compose up --build
```

| سرویس | آدرس |
|---|---|
| Backend API | `http://localhost:3420/api/v1` |
| Frontend | `http://localhost:3421` |
| MySQL | `localhost:3422` |
| Health | `http://localhost:3420/health` |
| Readiness | `http://localhost:3420/ready` |

## دادهٔ نمونهٔ توسعه

seed فقط با `AUTO_SEED=true` و دیتابیس خالی اجرا می‌شود و تراکنشی است.

| نقش | موبایل |
|---|---|
| ادمین | `09130000000` |
| قرآن‌آموز | `09130000001` |
| استاد قرآن | `09130000002` |
| استاد مداحی | `09130000003` |
| استاد بانو | `09130000004` |

seed امتیاز، تعداد جلسه، follower یا نمودار ساختگی ایجاد نمی‌کند.

## اجرای مستقل

### Backend

```bash
cd backend
go mod download
go run ./cmd/server
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

### Flutter

```bash
cd app
flutter pub get --enforce-lockfile
flutter run --dart-define=API_URL=http://10.0.2.2:3420/api/v1
```

## کنترل کیفیت

```bash
cd backend
gofmt -w .
go vet ./...
go test -race ./...
go build ./...

cd ../frontend
npm ci
npm test
npm run lint
npm run build

cd ../app
flutter pub get --enforce-lockfile
flutter analyze
flutter test
```

تست‌های مخزن availability و timezone رسمی، policy لغو، عملیات مالی، onboarding، review، BFF، صداقت محتوای UI، moderation خدمت، برداشت و parsing مدل Flutter را پوشش می‌دهند.

Workflow همین بررسی‌ها را با MySQL واقعی و validation فایل‌های Docker تعریف می‌کند. در اجرای commit نهایی، GitHub Actions هر چهار job را پیش از checkout و با `steps: null` متوقف کرده است؛ بنابراین failure فعلی اثبات‌کنندهٔ خطای کد نیست، اما جایگزین اجرای موفق CI نیز محسوب نمی‌شود.

## قرارداد زمان جلسه

- `scheduled_at` همیشه UTC و منبع حقیقت ذخیره و مقایسه است.
- Backend برای availability و فهرست جلسه، `local_date`، `local_start` و `local_end` را بر اساس `APP_TIMEZONE` برمی‌گرداند.
- وب و Flutter فقط فیلدهای `local_*` را نمایش می‌دهند و به timezone دستگاه متکی نیستند.
- availability قطعی نیست؛ رزرو همهٔ قواعد را دوباره هنگام submit بررسی می‌کند و در تداخل پاسخ conflict می‌دهد.

## امنیت و یکپارچگی

- JWT وب فقط در cookie امن `HttpOnly` است و تمام پنل‌ها از BFF عبور می‌کنند.
- JWT اپ در platform secure storage است.
- نقش و فعال‌بودن حساب در هر درخواست محافظت‌شده از دیتابیس بررسی می‌شود.
- OTP به‌صورت HMAC digest ذخیره می‌شود.
- رزرو، refund، settlement، برداشت، onboarding و review مرز تراکنش دارند.
- لغو learner فقط پیش از شروع جلسه مجاز است.
- خدمت غیرفعال را فقط مدیر می‌تواند دوباره منتشر کند.
- mutationهای موفق مدیر audit و در پنل قابل مشاهده‌اند.
- Android release بدون keystore production عمداً fail می‌شود.

## وضعیت UI/UX

- loading، empty، error و retry در مسیرهای اصلی مستقل‌اند.
- نمودار، امتیاز، درآمد، تماس صوتی، شارژ و CTAهای ساختگی حذف شده‌اند.
- جستجوی وب abortable و صفحه‌بندی‌شده است؛ جستجوی Flutter فیلتر server-side دارد.
- پنل استاد در وب و اپ درخواست، جلسه، تکمیل، خدمت، زمان کاری، کیف پول و برداشت واقعی دارد.
- شماره کارت/شبا و موجودی برداشت در وب و Flutter اعتبارسنجی می‌شوند.
- ناوبری موبایل، focus-visible و reduced-motion پیاده شده‌اند.
- FAQ، قوانین و حریم خصوصی با قابلیت‌های فعال هماهنگ‌اند.

## استقرار production

```bash
cp .env.example .env
# مقادیر production را تنظیم کنید
docker compose -f docker-compose.deploy.yml up -d --build
```

در production:

- MySQL، Backend و Frontend فقط روی `127.0.0.1` publish می‌شوند.
- Reverse proxy باید TLS را terminate کند.
- `APP_ENV=production` الزامی است.
- bypass OTP، seed خودکار و شارژ مستقیم توسعه‌ای غیرفعال‌اند.
- فایل keystore واقعی Android باید خارج از Git نگهداری شود.

راهنمای عملیات: [`docs/production-runbook.md`](docs/production-runbook.md)

## بدهی باقی‌مانده

- زرین‌پال واقعی و payment reconciliation
- provider تماس صوتی و lifecycle اتصال
- migration نسخه‌دار، rollback و foreign-key audit
- Redis/shared limiter و object storage برای چند replica
- metrics، tracing، alerting و staging E2E/restore drill
- accessibility audit کامل با screen reader
- archive/signing واقعی iOS و انتشار رسمی اپ

جزئیات: [`CHECKLIST.md`](CHECKLIST.md) و [`docs/audit-2026-07-27.md`](docs/audit-2026-07-27.md)

## مستندات

- [معماری](docs/architecture.md)
- [مرجع API](docs/api.md)
- [راهنمای توسعه](docs/development.md)
- [راهنمای استقرار](docs/deployment.md)
- [Runbook تولید](docs/production-runbook.md)
- [ممیزی فنی و UI/UX](docs/audit-2026-07-27.md)
- [ممیزی production قبلی](docs/audit-2026-07-21.md)

</div>
