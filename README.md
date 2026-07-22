<div dir="rtl">

# وُدّا (Vodda)

**همراه یادگیری قرآن و مداحی** — پلتفرمی برای یافتن استاد، رزرو جلسه، مدیریت کیف پول و پیگیری چرخهٔ جلسه میان قرآن‌آموز و استاد.

## وضعیت فعلی

هستهٔ محصول برای یک استقرار تک‌نمونه‌ای پیاده شده است:

- ورود OTP، JWT و کنترل نقش جاری از دیتابیس
- پروفایل و تأیید استاد، خدمات و ساعات کاری
- جستجوی عمومی استادان تأییدشده
- رزرو، پذیرش، رد، لغو، تکمیل و امتیازدهی جلسه
- کیف پول، دفتر تراکنش، refund، settlement و برداشت اتمیک
- فرم پشتیبانی ذخیره‌شونده و audit log عملیات ادمین
- وب Next.js با نشست HttpOnly/BFF
- اپ Flutter با secure storage و release signing اجباری
- Docker، readiness، backup/restore و CI چندلایه

قابلیت‌های بیرونی **درگاه واقعی زرین‌پال** و **تماس صوتی واقعی** هنوز تکمیل نشده‌اند و در UI production به‌عنوان قابلیت فعال نمایش داده نمی‌شوند.

## ساختار مخزن

```text
VoddaProject/
├── backend/                  # Go + Gin + GORM + MySQL
├── frontend/                 # Next.js App Router + TypeScript
├── app/                      # Flutter + Riverpod + go_router + Dio
├── docs/                     # معماری، API، ممیزی و runbook
├── ops/                      # backup/restore
├── docker-compose.yml        # توسعه
└── docker-compose.deploy.yml # استقرار production
```

## اجرای محلی

```bash
cp .env.example .env
# مقادیر توسعه را تنظیم کنید
docker compose up --build
```

سرویس‌ها:

| سرویس | آدرس |
|---|---|
| Backend API | `http://localhost:3420/api/v1` |
| Frontend | `http://localhost:3421` |
| MySQL | `localhost:3422` |
| Health | `http://localhost:3420/health` |
| Readiness | `http://localhost:3420/ready` |

## دادهٔ نمونهٔ توسعه

seed فقط در صورت فعال‌بودن `AUTO_SEED` و خالی‌بودن دیتابیس اجرا می‌شود و تراکنشی است.

| نقش | موبایل |
|---|---|
| ادمین | `09130000000` |
| قرآن‌آموز | `09130000001` |
| استاد قرآن | `09130000002` |
| استاد مداحی | `09130000003` |
| استاد بانو | `09130000004` |

seed امتیاز، تعداد جلسه یا follower ساختگی ایجاد نمی‌کند.

## اجرای مستقل سرویس‌ها

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

CI همین بررسی‌ها را به‌همراه MySQL واقعی و اعتبارسنجی Docker Compose اجرا می‌کند. در تاریخ ۲۰۲۶-۰۷-۲۱، GitHub Actions مخزن jobها را پیش از اولین step متوقف می‌کرد؛ این مانع عملیاتی در گزارش ممیزی ثبت شده است و نباید با failure تست کد اشتباه گرفته شود.

## امنیت و یکپارچگی

- JWT وب فقط در cookie امن `HttpOnly` نگهداری می‌شود.
- JWT اپ در platform secure storage است و در `SharedPreferences` ذخیره نمی‌شود.
- نقش و فعال‌بودن حساب در هر درخواست محافظت‌شده از دیتابیس بررسی می‌شود.
- OTP جدید به‌صورت HMAC digest ذخیره می‌شود.
- رزرو، refund، settlement، برداشت، onboarding استاد و امتیازدهی مرز تراکنش دارند.
- ورودی JSON ناشناخته یا ناقص رد می‌شود و booleanهای مدیریتی باید صریح باشند.
- آپلود آواتار محدودیت حجم، MIME، پسوند و cleanup فایل ناقص دارد.
- mutationهای موفق ادمین audit می‌شوند.
- Android release بدون keystore production عمداً fail می‌شود.

## استقرار production

```bash
cp .env.example .env
# مقادیر production را تنظیم کنید
docker compose -f docker-compose.deploy.yml up -d --build
```

در production:

- MySQL، Backend و Frontend فقط روی `127.0.0.1` publish می‌شوند.
- Reverse proxy باید TLS را terminate کند و فقط Frontend/API لازم را منتشر کند.
- `APP_ENV=production` الزامی است.
- bypass OTP، seed خودکار و شارژ مستقیم توسعه‌ای غیرفعال‌اند.
- برای Android، `app/android/key.properties.example` را مبنا قرار دهید و فایل واقعی را خارج از Git نگه دارید.

راهنمای عملیات: [`docs/production-runbook.md`](docs/production-runbook.md)

## بدهی فنی باقی‌مانده

- درگاه واقعی زرین‌پال و reconciliation پرداخت
- provider تماس صوتی و lifecycle توکن/اتصال
- migrationهای نسخه‌دار و بررسی foreign keyها به‌جای اتکای نهایی به AutoMigrate
- Redis و object storage برای چند replica
- observability مرکزی و E2E روی staging
- بررسی archive/signing واقعی iOS و انتشار رسمی اپ

جزئیات کامل: [`CHECKLIST.md`](CHECKLIST.md) و [`docs/audit-2026-07-21.md`](docs/audit-2026-07-21.md)

## مستندات

- [معماری](docs/architecture.md)
- [مرجع API](docs/api.md)
- [راهنمای توسعه](docs/development.md)
- [راهنمای استقرار](docs/deployment.md)
- [Runbook تولید](docs/production-runbook.md)
- [ممیزی ۲۰۲۶-۰۷-۲۱](docs/audit-2026-07-21.md)

</div>
