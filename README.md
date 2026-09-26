<div dir="rtl">

# وُدّا (Vodda)

**همراه یادگیری قرآن و مداحی** — پلتفرمی برای یافتن استاد، رزرو جلسه، مدیریت کیف پول و پیگیری چرخهٔ جلسه میان قرآن‌آموز و استاد.

## وضعیت فعلی

هستهٔ محصول برای استقرار تک‌نمونه‌ای پیاده شده و اپ کاربری در حال حاضر بر معماری **Universal React Frontend + Capacitor** استوار است:

- OTP، JWT و کنترل نقش/فعال‌بودن حساب از دیتابیس
- پروفایل، onboarding و moderation استاد و خدمت
- جستجوی عمومی با فیلتر server-side و pagination
- availability رزرو در Backend بر اساس `APP_TIMEZONE`، مدت خدمت، برنامهٔ کاری و تداخل
- نگهداری UTC برای منطق و فیلدهای رسمی `local_date/local_start/local_end` برای نمایش یکسان همهٔ clientها
- رزرو، پذیرش، رد، لغو پیش از شروع، تکمیل و امتیازدهی
- کیف پول، refund، settlement و برداشت اتمیک
- صفحات public و پنل وب موجود زیر `/panel/...`
- Universal App مستقل زیر `/app/...` با parity کدنویسی learner و teacher
- source مشترک Universal App در `frontend/src/universal-app/` بدون وابستگی به `next/*`
- wrapper مستقل Capacitor/Vite در `frontend/native/` برای Android/iOS با local web bundle
- نشست وب با HttpOnly cookie + BFF و auth بومی با secure token + `Authorization: Bearer`
- پشتیبانی ذخیره‌شونده و audit log عملیات مدیر
- Docker، readiness، backup/restore و workflow کنترل کیفیت چندلایه

درگاه واقعی زرین‌پال و تماس صوتی واقعی هنوز تکمیل نشده‌اند و در UI production به‌عنوان قابلیت فعال نمایش داده نمی‌شوند.

## معماری Frontend و App

سه مرز اصلی باید مستقل باقی بمانند:

1. صفحات public و `/panel/...` توسط Next.js میزبانی می‌شوند و مهاجرت اپ نباید آن‌ها را تغییر دهد.
2. اپ کاربری فقط زیر `/app/...` mount می‌شود، اما منطق و UI آن در `frontend/src/universal-app/` قرار دارد و نباید از `next/navigation`، `next/link` یا server-only moduleهای Next استفاده کند.
3. نسخهٔ native همان Universal Source را از wrapper واقع در `frontend/native/` اجرا می‌کند. Capacitor باید bundle محلی را load کند و استفاده از `server.url` برای نمایش سایت آنلاین مجاز نیست.

قرارداد احراز هویت نیز عمداً بین دو platform متفاوت است:

- **Web:** HttpOnly cookie + Next BFF؛ token نباید در JavaScript وب در دسترس قرار گیرد.
- **Native:** secure token storage + درخواست مستقیم Go API با `Authorization: Bearer`.

Routeهای اصلی Universal App شامل `/app`, `/app/login`, `/app/search`, `/app/teacher/:id`, `/app/book/:id`, `/app/sessions`, `/app/wallet`, `/app/profile` و namespace استاد زیر `/app/t/...` هستند. ساخت URL و base path در router مشترک متمرکز شده و برای استقرار آینده روی `app.vodda.ir` نیز قابل تنظیم است.

جزئیات و وضعیت migration: [`docs/universal-app-migration-roadmap.md`](docs/universal-app-migration-roadmap.md)

## ساختار مخزن

```text
VoddaProject/
├── backend/                         # Go + Gin + GORM + MySQL
├── frontend/                        # Next.js host + Universal React App
│   ├── src/universal-app/           # source مشترک web/native؛ مستقل از next/*
│   └── native/                      # Vite + Capacitor wrapper
├── app/                             # Flutter؛ deprecated reference/fallback تا تصمیم حذف
├── docs/                            # معماری، API، migration، ممیزی و runbook
├── ops/                             # backup/restore
├── docker-compose.yml               # توسعه
└── docker-compose.deploy.yml        # production
```

## اجرای محلی

```bash
cp .env.example .env.local
# مقادیر توسعه را تنظیم کنید
./debug.sh up
```

برای اجرای پس‌زمینه: `./debug.sh up-d` و برای مشاهدهٔ لاگ‌ها: `./debug.sh logs`.

| سرویس | آدرس |
|---|---|
| Backend API | `http://localhost:3420/api/v1` |
| Frontend | `http://localhost:3421` |
| Universal App | `http://localhost:3421/app` |
| MySQL | `localhost:3422` |
| منافسه | `http://localhost:3423` |
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

### Frontend + Universal Web App

```bash
cd frontend
npm ci
npm run dev
```

Universal App از همان Next host روی `/app/...` mount می‌شود. Web runtime باید قرارداد HttpOnly/BFF را حفظ کند.

### Native wrapper

اسکریپت‌های native در `frontend/package.json` تعریف شده‌اند:

```bash
cd frontend
npm run native:dev
npm run native:build
npm run cap:sync
npm run cap:android
npm run cap:ios
```

`frontend/native/capacitor.config.ts` باید `appId = ir.vodda.vodda` را حفظ کند، bundle محلی را از `webDir` اجرا کند و API مستقیم native را از env/config دریافت کند. capabilityهای device از طریق platform adapter تزریق می‌شوند تا Universal Source به Capacitor وابسته نشود.

راهنمای capabilityهای native: [`docs/native-capabilities.md`](docs/native-capabilities.md)

### Flutter reference

Flutter دیگر source اصلی توسعهٔ اپ نیست و فقط به‌عنوان reference/fallback مهاجرت نگهداری می‌شود:

```bash
cd app
flutter pub get --enforce-lockfile
flutter run --dart-define=API_URL=http://10.0.2.2:3420/api/v1
```

حذف پوشهٔ `app/` یا حذف Flutter از workflowها فقط با تصمیم صریح جداگانه انجام می‌شود.

## کنترل کیفیت

دستورهای معمول کنترل کیفیت مخزن:

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

برای wrapper native، validationهای build/sync و Android/iOS نیز جدا از parity کدنویسی انجام می‌شوند. در roadmap مهاجرت، نبود امکان اجرای build/test/npm install مانع ادامهٔ کدنویسی محسوب نمی‌شود.

تست‌های مخزن availability و timezone رسمی، policy لغو، عملیات مالی، onboarding، review، BFF، صداقت محتوای UI، moderation خدمت، برداشت و parsing مدل Flutter را پوشش می‌دهند.

## قرارداد زمان جلسه

- `scheduled_at` همیشه UTC و منبع حقیقت ذخیره و مقایسه است.
- Backend برای availability و فهرست جلسه، `local_date`، `local_start` و `local_end` را بر اساس `APP_TIMEZONE` برمی‌گرداند.
- همهٔ clientها باید برای نمایش زمان جلسه از فیلدهای رسمی `local_*` استفاده کنند و به timezone دستگاه متکی نباشند.
- availability قطعی نیست؛ رزرو همهٔ قواعد را دوباره هنگام submit بررسی می‌کند و در تداخل پاسخ conflict می‌دهد.

## امنیت و یکپارچگی

- JWT وب فقط در cookie امن `HttpOnly` است و Universal Web App/پنل وب از BFF عبور می‌کنند.
- Native token فقط در secure storage نگهداری و توسط native adapter به Bearer header تبدیل می‌شود.
- Universal Source نباید secure token یا primitiveهای اختصاصی Next/Capacitor را مستقیماً مدیریت کند.
- نقش و فعال‌بودن حساب در هر درخواست محافظت‌شده از دیتابیس بررسی می‌شود.
- OTP به‌صورت HMAC digest ذخیره می‌شود.
- رزرو، refund، settlement، برداشت، onboarding و review مرز تراکنش دارند.
- لغو learner فقط پیش از شروع جلسه مجاز است.
- خدمت غیرفعال را فقط مدیر می‌تواند دوباره منتشر کند.
- mutationهای موفق مدیر audit و در پنل قابل مشاهده‌اند.
- Android release بدون keystore production عمداً fail می‌شود.

## وضعیت UI/UX

- loading، empty، error و retry در flowهای اصلی learner و teacher پیاده شده‌اند.
- نمودار، امتیاز، درآمد، تماس صوتی، شارژ و CTAهای ساختگی حذف شده‌اند.
- Universal learner app جستجو، پروفایل استاد، رزرو، جلسات، کیف پول و پروفایل واقعی دارد.
- Universal teacher app داشبورد، درخواست‌ها/جلسات، خدمات، زمان کاری، کیف پول/برداشت، پروفایل و reviewهای واقعی دارد.
- moderation خدمت authoritative باقی مانده و استاد امکان self-approve ندارد.
- زمان جلسه فقط از `local_*` رسمی backend نمایش داده می‌شود.
- ناوبری اپ مستقل از `/panel`، RTL، safe-area و route contract مرکزی دارد.
- FAQ، قوانین و حریم خصوصی با قابلیت‌های فعال هماهنگ‌اند.

## استقرار Web و Native

### Web production

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
- Universal Web App می‌تواند با base path `/app` یا در استقرار جداگانه روی root ساب‌دامین اجرا شود.
- BFF/auth origin وب configurable است، ولی مدل auth همچنان HttpOnly cookie باقی می‌ماند.

راهنمای دو حالت `vodda.ir/app/...` و `app.vodda.ir/...`: [`docs/universal-app-web-deployment.md`](docs/universal-app-web-deployment.md)

### Native

- Capacitor فقط local generated bundle را load می‌کند.
- `server.url` نباید برای نمایش نسخهٔ آنلاین تنظیم شود.
- API base URL بومی از config/env دریافت می‌شود.
- token بومی در secure storage است و درخواست API با Bearer ارسال می‌شود.
- فایل‌های signing/keystore واقعی باید خارج از Git نگهداری شوند.

راهنمای عملیات: [`docs/production-runbook.md`](docs/production-runbook.md)

## بدهی باقی‌مانده

- زرین‌پال واقعی و payment reconciliation
- provider تماس صوتی و lifecycle اتصال
- migration نسخه‌دار، rollback و foreign-key audit
- Redis/shared limiter و object storage برای چند replica
- metrics، tracing، alerting و staging E2E/restore drill
- accessibility audit کامل با screen reader
- archive/signing واقعی iOS و انتشار رسمی اپ
- cleanup نهایی migration و تصمیم صریح دربارهٔ زمان حذف Flutter reference

جزئیات: [`CHECKLIST.md`](CHECKLIST.md) و [`docs/universal-app-migration-roadmap.md`](docs/universal-app-migration-roadmap.md)

## مستندات

- [رودمپ Universal App + Capacitor](docs/universal-app-migration-roadmap.md)
- [استقرار Universal Web App](docs/universal-app-web-deployment.md)
- [Native capability contract](docs/native-capabilities.md)
- [معماری](docs/architecture.md)
- [مرجع API](docs/api.md)
- [راهنمای توسعه](docs/development.md)
- [راهنمای استقرار](docs/deployment.md)
- [Runbook تولید](docs/production-runbook.md)
- [ممیزی فنی و UI/UX](docs/audit-2026-07-27.md)
- [ممیزی production قبلی](docs/audit-2026-07-21.md)

</div>
