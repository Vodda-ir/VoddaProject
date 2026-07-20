<div dir="rtl">

# وُدّا (Vodda)

**همراه یادگیری قرآن و مداحی** — پلتفرمی برای یافتن استاد، رزرو جلسه، مدیریت کیف پول و پیگیری چرخهٔ جلسه میان قرآن‌آموز و استاد.

این مخزن یک monorepo با سه بخش اصلی است:

| پوشه | کاربرد | استک |
|---|---|---|
| [`app/`](app/) | اپ موبایل قرآن‌آموز و استاد | Flutter · Riverpod · go_router |
| [`backend/`](backend/) | API و منطق کسب‌وکار | Go · Gin · GORM · MySQL |
| [`frontend/`](frontend/) | وب‌سایت و پنل‌های کاربر، استاد و مدیر | Next.js · TypeScript |

> **وضعیت محصول:** هستهٔ نرم‌افزار، زیرساخت استقرار، امنیت نشست وب، عملیات مالی داخلی، backup/restore و CI برای استقرار production آماده شده‌اند. عرضهٔ تجاری عمومی همچنان به اتصال و تست واقعی درگاه پرداخت، انتخاب provider تماس صوتی، چرخاندن secret قدیمی پیامک و smoke test روی سرور مقصد وابسته است. جزئیات در [`docs/audit-2026-07-20.md`](docs/audit-2026-07-20.md) و [`docs/production-runbook.md`](docs/production-runbook.md) آمده است.

---

## پورت‌ها

| سرویس | پورت میزبان | دسترسی production |
|---|---:|---|
| Backend | `3420` | فقط localhost/reverse proxy |
| Frontend | `3421` | فقط localhost/reverse proxy |
| MySQL | `3422` | فقط localhost |

## شروع سریع توسعه

```bash
cp .env.example .env.local
./docker-debug.sh up-d
./docker-debug.sh logs
```

پس از اجرا:

- وب و پنل‌ها: <http://localhost:3421>
- API: <http://localhost:3420/api/v1>
- Liveness: <http://localhost:3420/live>
- Readiness دیتابیس: <http://localhost:3420/ready>
- MySQL: `localhost:3422`

تنظیمات نمونه فقط برای توسعه هستند:

- `AUTO_SEED=true` دادهٔ آزمایشی ایجاد می‌کند.
- `OTP_TEST_BYPASS_ENABLED=true` کد ثابت `33365` را فعال می‌کند.
- `DEV_WALLET_CHARGE_ENABLED=true` شارژ مستقیم کیف پول را فقط در محیط غیر production فعال می‌کند.

### حساب‌های seed

| نقش | موبایل | کد توسعه |
|---|---|---|
| مدیر | `09136336002` | `33365` |
| قرآن‌آموز | `09120000000` | `33365` |
| استاد نمونه | `09120000001` | `33365` |

> Backend در production با seed، OTP bypass، شارژ مستقیم کیف پول، JWT ضعیف یا تنظیم ناقص پیامک اجرا نمی‌شود.

---

## اجرای جداگانه

### Backend

```bash
cd backend
DB_HOST=127.0.0.1 \
DB_PORT=3422 \
DB_USER=root \
DB_PASSWORD=vodda_secret \
DB_NAME=vodda \
JWT_SECRET=dev-insecure-secret-change-me \
AUTO_SEED=true \
OTP_TEST_BYPASS_ENABLED=true \
DEV_WALLET_CHARGE_ENABLED=true \
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
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3420/api/v1
```

---

## کنترل کیفیت

Workflow فایل [`.github/workflows/ci.yml`](.github/workflows/ci.yml) روی pull request و push به `main` اجرا می‌شود:

- Backend: `gofmt`، `go vet`، integration test واقعی MySQL با race detector و `go build`
- Frontend: نصب lockfile و type-check/build کامل Next.js
- Flutter: `flutter analyze` و `flutter test`
- Deployment: اعتبارسنجی shell scriptها و `docker compose config`

اجرای محلی معادل:

```bash
(cd backend && test -z "$(gofmt -l .)" && go vet ./... && go test -race ./... && go build ./...)
(cd frontend && npm ci && npm run build)
(cd app && flutter pub get && flutter analyze && flutter test)
```

Integration test مالی با MySQL:

```bash
TEST_MYSQL_DSN='root:password@tcp(127.0.0.1:3306)/vodda_test?charset=utf8mb4&parseTime=True&loc=UTC' \
  go test -race ./internal/repository/...
```

---

## امنیت و قابلیت اتکا

موارد پیاده‌سازی‌شده:

- نشست وب با cookie امن `HttpOnly` و BFF در Next.js؛ JWT در `localStorage` قرار نمی‌گیرد.
- بررسی نقش پنل‌ها در middleware و جلوگیری از نمایش عمومی استاد pending/غیرفعال.
- عملیات اتمیک MySQL برای رزرو، escrow، refund، settlement، شارژ توسعه‌ای و برداشت.
- debit شرطی و row locking برای جلوگیری از موجودی منفی و اجرای تکراری عملیات مالی.
- reconciliation دفتر تراکنش با موجودی، همراه با integration test و تست هم‌زمانی.
- rate limit برای OTP، جستجو، mutationها، عملیات مالی و پنل مدیر.
- request ID، لاگ JSON، security header، محدودیت body و readiness check دیتابیس.
- اعتبارسنجی واقعی MIME، پسوند و حجم آواتار و storage پایدار Docker.
- backup فشرده MySQL با checksum و restore محافظت‌شده همراه با safety backup.
- پورت‌های production فقط روی localhost و dependency readiness در Docker Compose.

برای چند replica باید limiter مشترک Redis/reverse proxy و object storage مشترک استفاده شود؛ limiter و volume فعلی برای استقرار تک-instance مناسب‌اند.

---

## استقرار production

```bash
chmod +x docker-deploy.sh ops/*.sh
docker compose -f docker-compose.deploy.yml config
./docker-deploy.sh
```

متغیرهای secret باید خارج از Git نگهداری شوند. حداقل این موارد الزامی‌اند:

```bash
MYSQL_ROOT_PASSWORD=...
DB_USER=vodda
DB_PASSWORD=...
DB_NAME=vodda
JWT_SECRET=<random-at-least-32-characters>
SMS_API_KEY=...
SMS_BODY_ID=...
FRONTEND_BASE_URL=https://vodda.ir
CORS_ALLOWED_ORIGINS=https://vodda.ir
```

راهنمای backup، restore، مانیتورینگ و رخداد مالی: [`docs/production-runbook.md`](docs/production-runbook.md)

---

## موانع باقی‌مانده برای عرضهٔ تجاری

1. اتصال واقعی زرین‌پال شامل request، redirect، callback، verify، idempotency و تست sandbox/production.
2. انتخاب و اتصال provider تماس صوتی، صدور token سمت سرور و مدیریت reconnect/failure.
3. rotate کردن API key قدیمی پیامک در پنل سرویس‌دهنده؛ حذف آن از HEAD تاریخچهٔ Git را باطل نمی‌کند.
4. اجرای smoke test و یک restore آزمایشی روی staging/سرور مقصد.
5. برای scale چند-instance: Redis rate limiter و object storage مشترک.

شارژ مستقیم `/wallet/charge` در production عمداً غیرفعال است و جایگزین درگاه پرداخت نیست.

---

## مستندات

- [معماری](docs/architecture.md)
- [مرجع API](docs/api.md)
- [دیپلوی](docs/deployment.md)
- [راهنمای عملیات production](docs/production-runbook.md)
- [Design system](docs/design-system.md)
- [گزارش ممیزی ۲۰۲۶-۰۷-۲۰](docs/audit-2026-07-20.md)
- [چک‌لیست پیشرفت](CHECKLIST.md)

## وضعیت فعلی

- ✅ احراز هویت OTP/JWT، RBAC و نشست امن وب
- ✅ رزرو با ساعات کاری، کنترل تداخل و عملیات مالی اتمیک
- ✅ refund، settlement و withdrawal با تست MySQL و concurrency
- ✅ پنل‌های وب و اپ Flutter برای جریان‌های اصلی
- ✅ rate limiting، observability، upload validation و readiness
- ✅ استقرار Docker سخت‌سازی‌شده و backup/restore
- ✅ CI چهارمرحله‌ای Backend، Frontend، Flutter و Deployment
- 🚧 پرداخت واقعی زرین‌پال و تماس صوتی واقعی
- 🚧 staging smoke test، external secret rotation و زیرساخت چند-instance

</div>
