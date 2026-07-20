<div dir="rtl">

# وُدّا (Vodda)

**همراه یادگیری قرآن و مداحی** — پلتفرمی برای یافتن استاد، رزرو جلسه، مدیریت کیف پول و پیگیری چرخهٔ جلسه میان قرآن‌آموز و استاد.

این مخزن یک monorepo با سه بخش اصلی است:

| پوشه | کاربرد | استک |
|---|---|---|
| [`app/`](app/) | اپ موبایل قرآن‌آموز و استاد | Flutter · Riverpod · go_router |
| [`backend/`](backend/) | API و منطق کسب‌وکار | Go · Gin · GORM · MySQL |
| [`frontend/`](frontend/) | وب‌سایت و پنل‌های کاربر، استاد و مدیر | Next.js · TypeScript |

> **وضعیت محصول:** جریان‌های اصلی نمونه پیاده‌سازی شده‌اند، اما محصول هنوز آمادهٔ انتشار عمومی نیست. پرداخت واقعی زرین‌پال، تماس صوتی واقعی، تست‌های جامع و تراکنش‌های دیتابیسی مالی جزو موانع انتشار هستند. گزارش کامل در [`docs/audit-2026-07-20.md`](docs/audit-2026-07-20.md) ثبت شده است.

---

## پورت‌ها

| سرویس | پورت میزبان |
|---|---:|
| Backend | `3420` |
| Frontend | `3421` |
| MySQL | `3422` |

## شروع سریع با Docker

```bash
cp .env.example .env.local
./docker-debug.sh up-d
./docker-debug.sh logs
```

پس از اجرا:

- وب و پنل‌ها: <http://localhost:3421>
- API: <http://localhost:3420/api/v1>
- Health check: <http://localhost:3420/health>
- MySQL: `localhost:3422`

تنظیمات نمونه فقط برای توسعه هستند:

- `AUTO_SEED=true` دادهٔ آزمایشی ایجاد می‌کند.
- `OTP_TEST_BYPASS_ENABLED=true` کد ثابت `33365` را فعال می‌کند.
- خالی‌بودن `OTP_TEST_MOBILE` یعنی کد توسعه برای همهٔ شماره‌های seed معتبر است.
- `DEV_WALLET_CHARGE_ENABLED=true` شارژ مستقیم کیف پول را فقط در محیط غیر production فعال می‌کند.

### حساب‌های seed

| نقش | موبایل | کد توسعه |
|---|---|---|
| مدیر | `09136336002` | `33365` |
| قرآن‌آموز | `09120000000` | `33365` |
| استاد نمونه | `09120000001` | `33365` |

> اجرای production در صورت فعال‌بودن OTP bypass، seed یا شارژ مستقیم کیف پول متوقف می‌شود.

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

Workflow فایل [`.github/workflows/ci.yml`](.github/workflows/ci.yml) روی push و pull request به `main` این کنترل‌ها را اجرا می‌کند:

- Backend: `gofmt`، `go vet`، `go test` و `go build`
- Frontend: نصب lockfile و `npm run build`
- Flutter: `flutter analyze` و `flutter test`

اجرای محلی معادل:

```bash
(cd backend && test -z "$(gofmt -l .)" && go vet ./... && go test ./... && go build ./...)
(cd frontend && npm ci && npm run build)
(cd app && flutter pub get && flutter analyze && flutter test)
```

---

## نکات امنیت و production

پیش از استقرار عمومی حداقل این موارد الزامی‌اند:

1. `APP_ENV=production` و یک `JWT_SECRET` تصادفی حداقل ۳۲ کاراکتری.
2. تنظیم دقیق `CORS_ALLOWED_ORIGINS` و `APP_TIMEZONE`.
3. مقدار واقعی `SMS_API_KEY` و `SMS_BODY_ID`.
4. خاموش‌بودن `AUTO_SEED`، `OTP_TEST_BYPASS_ENABLED` و `DEV_WALLET_CHARGE_ENABLED`.
5. پیاده‌سازی request/callback/verify واقعی درگاه پرداخت؛ endpoint توسعهٔ `/wallet/charge` جایگزین درگاه نیست.
6. انتقال آپلودها به storage پایدار و اعتبارسنجی MIME/حجم فایل.
7. افزودن backup، monitoring، rate limit و تست بازیابی.

---

## مستندات

- [معماری](docs/architecture.md)
- [مرجع API](docs/api.md)
- [دیپلوی](docs/deployment.md)
- [Design system](docs/design-system.md)
- [گزارش ممیزی ۲۰۲۶-۰۷-۲۰](docs/audit-2026-07-20.md)
- [چک‌لیست پیشرفت](CHECKLIST.md)

## وضعیت فعلی

- ✅ احراز هویت OTP/JWT، RBAC، پروفایل‌ها و مدیریت استاد
- ✅ رزرو با کنترل زمان گذشته، ساعات کاری و تداخل جلسه
- ✅ چرخهٔ درخواست/پذیرش/رد/لغو/اتمام و امتیازدهی
- ✅ کیف پول آزمایشی، escrow، درآمد و درخواست برداشت
- ✅ پنل‌های وب و اپ Flutter برای جریان‌های اصلی
- ✅ CI پایه و سخت‌سازی تنظیمات production
- 🚧 پرداخت زرین‌پال واقعی، تماس صوتی واقعی و atomic transactionهای مالی
- 🚧 پوشش تست واحد، integration، widget و end-to-end

</div>
