# دستورالعمل پیاده‌سازی MVP وُدّا با معماری سه‌اپی و Docker واحد

مرجع نیازمندی: این سند بر پایه‌ی `vodda.md` تدوین شده و برای اجرای عملی MVP بازطراحی شده است.

## 1) هدف و دامنه MVP

هدف MVP این است که کاربر بتواند استاد مناسب را پیدا کند، جلسه صوتی رزرو کند، پرداخت انجام دهد و بعد از جلسه امتیاز ثبت کند؛ استاد هم درخواست‌ها را مدیریت کند و ادمین کل چرخه را کنترل کند.

### نقش‌ها
1. `learner` (قرآن‌آموز)
2. `teacher` (استاد)
3. `admin` (ادمین)

### قابلیت‌های داخل دامنه
1. ثبت‌نام/ورود با OTP
2. پروفایل کاربر و تکمیل پروفایل استاد
3. تایید/رد استاد توسط ادمین
4. جستجو و مشاهده اساتید
5. رزرو جلسه و پذیرش/رد درخواست
6. جلسه صوتی با LiveKit
7. کیف پول، کمیسیون، برداشت
8. امتیازدهی و نظر
9. نوتیفیکیشن‌های پایه

### خارج از دامنه MVP
1. تماس تصویری
2. چت درون‌برنامه‌ای کامل
3. پیشنهاد زمان جایگزین خودکار
4. تسویه اتوماتیک بانکی به استاد

## 2) معماری نهایی سه اپ

معماری قطعی سیستم شامل ۳ اپ است:
1. `backend`: API و منطق کسب‌وکار
2. `main`: وب‌اپ واحد برای لندینگ + پنل کاربر + پنل ادمین
3. `app`: اپ Flutter واحد برای Learner/Teacher

زیرساخت مشترک:
1. `Mysql`

## 3) تصمیم کلیدی: اپ Flutter واحد برای Learner/Teacher

اپ استاد جداگانه حذف می‌شود. کاربر با یک اپ Flutter وارد می‌شود و بر اساس نقش فعال، UI و مسیرها تغییر می‌کند.

### قواعد نقش
1. هر کاربر می‌تواند چند نقش داشته باشد (`roles[]`).
2. هر سشن یک `active_role` دارد.
3. سوییچ نقش از طریق API انجام می‌شود: `POST /me/active-role`.
4. endpointها باید role-aware باشند، نه app-aware.

## 4) ساختار Monorepo و مسیر فایل‌ها

```text
VoddaProject/
  apps/
    backend-go/
      cmd/api/
      internal/
        auth/
        users/
        teachers/
        bookings/
        sessions/
        wallet/
        ratings/
        notifications/
        admin/
      db/
        migrations/
        query/
      Dockerfile
    web/
      app/
      components/
      lib/
      Dockerfile
    mobile-flutter/
      lib/
        features/
        core/
      pubspec.yaml
      Dockerfile
  docker-compose.yml
  .env.example
  README.md
  vodda.md
  VODDA_IMPLEMENTATION_GUIDE.md
  VODDA_3APP_BUILD_GUIDE.md
```

## 5) Backend Go (Gin + sqlc + pgx) با ماژول‌ها و API Contract

### پشته فنی قطعی
1. `Go 1.23+`
2. `Gin`
3. `sqlc + pgx`
4. `PostgreSQL 16`
5. `Redis 7`
6. `MinIO`

### ماژول‌ها
1. `auth`: OTP, JWT, refresh
2. `users`: پروفایل، نقش‌ها، active role
3. `teachers`: پروفایل استاد، تایید ادمین
4. `bookings`: درخواست رزرو و وضعیت
5. `sessions`: توکن LiveKit و lifecycle جلسه
6. `wallet`: شارژ، کسر، کمیسیون، برداشت
7. `ratings`: امتیاز و نظر
8. `notifications`: درون‌برنامه‌ای
9. `admin`: مدیریت اساتید/برداشت/گزارش

### مدل احراز هویت
1. Access Token: کوتاه‌مدت (مثلا 15 دقیقه)
2. Refresh Token: بلندمدت (مثلا 30 روز)
3. Claims استاندارد JWT:
   - `sub`
   - `roles[]`
   - `active_role`
   - `session_id`
   - `exp`

### قرارداد خطا (Error Contract)
تمام خطاها باید این ساختار را داشته باشند:

```json
{
  "error": {
    "code": "BOOKING_SLOT_CONFLICT",
    "message": "Selected slot is no longer available",
    "request_id": "req_01..."
  }
}
```

### قواعد Idempotency
1. `POST /bookings` باید هدر `Idempotency-Key` را پشتیبانی کند.
2. `POST /wallet/topup/initiate` باید idempotent باشد تا تراکنش تکراری ایجاد نشود.
3. `POST /wallet/topup/verify` باید callback تکراری زرین‌پال را safe هندل کند.

### API قطعی MVP

#### Auth
1. `POST /auth/request-otp`
   - `200`: OTP sent
   - `429`: rate limit
2. `POST /auth/verify-otp`
   - `200`: access/refresh token
   - `401`: invalid/expired OTP

#### Profile & Roles
1. `GET /me`
2. `PATCH /me/profile`
3. `POST /me/active-role`

#### Teacher
1. `POST /teacher/profile`
2. `GET /teachers?query=&specialty=&level=&min_price=&max_price=`
3. `GET /teachers/:id`

#### Booking
1. `POST /bookings`
2. `POST /bookings/:id/accept`
3. `POST /bookings/:id/reject`

#### Session (LiveKit)
1. `POST /sessions/:id/token`
2. `POST /sessions/:id/start`
3. `POST /sessions/:id/end`

#### Wallet
1. `POST /wallet/topup/initiate`
2. `POST /wallet/topup/verify`
3. `POST /wallet/withdraw-requests`
4. `GET /wallet/transactions`

#### Ratings
1. `POST /ratings`

#### Admin
1. `GET /admin/teachers/pending`
2. `POST /admin/teachers/:id/approve`
3. `POST /admin/teachers/:id/reject`
4. `GET /admin/withdraw-requests`
5. `POST /admin/withdraw-requests/:id/process`

### کدهای وضعیت پیشنهادی
1. `200/201` موفق
2. `400` ورودی نامعتبر
3. `401` احراز هویت نامعتبر
4. `403` نقش/مجوز ناکافی
5. `404` پیدا نشد
6. `409` تداخل وضعیت یا slot
7. `422` rule failure
8. `429` rate limit
9. `500` خطای داخلی

## 6) Web App واحد (Next.js) با Route Map لندینگ/اپ/ادمین

### پشته فنی
1. `Next.js (App Router)`
2. `TypeScript`
3. `Tailwind CSS`

### Route Map قطعی
1. Landing
   - `/`
   - `/about`
   - `/teachers`
2. User App
   - `/app/dashboard`
   - `/app/bookings`
   - `/app/wallet`
   - `/app/profile`
3. Admin
   - `/admin/login`
   - `/admin/teachers/pending`
   - `/admin/withdraw-requests`
   - `/admin/reports`

### قوانین دسترسی
1. middleware باید access token را validate کند.
2. مسیرهای `/admin/*` فقط برای `admin`.
3. مسیرهای `/app/*` برای `learner` یا `teacher`.

## 7) Flutter App واحد با Role-Based Navigation

### اصول ثابت
1. یک اپ، یک login flow.
2. ناوبری وابسته به `active_role`.
3. سوییچ نقش در Settings/Profile.
4. اگر کاربر teacher verified نباشد، بخش teacher dashboard محدود باشد.

### ساختار ماژول
1. `features/auth`
2. `features/home`
3. `features/teacher_profile_setup`
4. `features/teacher_requests`
5. `features/booking`
6. `features/session_voice`
7. `features/wallet`
8. `features/rating`
9. `features/notifications`

### جلسه صوتی
1. Flutter token را از `POST /sessions/:id/token` می‌گیرد.
2. اتصال با LiveKit SDK انجام می‌شود.
3. وضعیت جلسه بعد از start/end باید به backend گزارش شود.

## 8) مدل داده و Migration Plan

### جداول قطعی
1. `users`
2. `user_roles`
3. `teacher_profiles`
4. `teacher_media`
5. `availability_slots`
6. `bookings`
7. `sessions`
8. `wallets`
9. `transactions`
10. `withdraw_requests`
11. `ratings`
12. `notifications`
13. `otp_requests`

### Enumهای قطعی
1. `booking_status`: `pending`, `accepted`, `rejected`, `cancelled`, `completed`
2. `session_status`: `scheduled`, `in_progress`, `ended`, `failed`
3. `transaction_type`: `topup`, `charge`, `commission`, `payout`, `refund`, `adjustment`
4. `withdraw_status`: `pending`, `approved`, `rejected`, `paid`
5. `teacher_verification_status`: `pending`, `approved`, `rejected`

### قیود مهم دیتابیس
1. `users.mobile` باید unique باشد.
2. جلوگیری از Double Booking با unique index روی بازه زمانی پذیرفته‌شده.
3. تراکنش‌ها ledger-style و append-only.
4. `teacher_profiles` با soft delete (`deleted_at`) مدیریت شود.
5. `ratings` فقط برای booking با وضعیت `completed`.

### Migration Plan
1. `001_init_extensions.sql`
2. `002_users_and_roles.sql`
3. `003_teacher_profiles.sql`
4. `004_availability_and_bookings.sql`
5. `005_sessions.sql`
6. `006_wallets_and_transactions.sql`
7. `007_withdraw_requests.sql`
8. `008_ratings_notifications_otp.sql`
9. `009_indexes_constraints.sql`
10. `010_seed_admin.sql`

## 9) Docker Compose واحد (`docker-compose.yml`) و Runbook کامل اجرا

### الزامات
1. فایل compose در ریشه ریپو: `docker-compose.yml`
2. سرویس‌ها: `postgres`, `redis`, `minio`, `backend`, `web`, `flutter_web`
3. شبکه و volume ثابت: `vodda_net`, `pg_data`, `minio_data`
4. `depends_on` با شرط `service_healthy`

### نمونه Compose مرجع

```yaml
version: "3.9"

name: vodda

services:
  postgres:
    image: postgres:16-alpine
    container_name: vodda_postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-vodda}
      POSTGRES_USER: ${POSTGRES_USER:-vodda}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-vodda}
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-vodda} -d ${POSTGRES_DB:-vodda}"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - vodda_net

  redis:
    image: redis:7-alpine
    container_name: vodda_redis
    ports:
      - "${REDIS_PORT:-6379}:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - vodda_net

  minio:
    image: minio/minio:latest
    container_name: vodda_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - "${MINIO_API_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
    volumes:
      - minio_data:/data
    networks:
      - vodda_net

  backend:
    build:
      context: ./apps/backend-go
    container_name: vodda_backend
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "${BACKEND_PORT:-8080}:8080"
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12
    networks:
      - vodda_net

  web:
    build:
      context: ./apps/web
    container_name: vodda_web
    env_file:
      - .env
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "${WEB_PORT:-3000}:3000"
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12
    networks:
      - vodda_net

  flutter_web:
    build:
      context: ./apps/mobile-flutter
    container_name: vodda_flutter_web
    env_file:
      - .env
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "${FLUTTER_WEB_PORT:-8081}:80"
    networks:
      - vodda_net

volumes:
  pg_data:
  minio_data:

networks:
  vodda_net:
    driver: bridge
```

### Runbook اجرا
1. `cp .env.example .env`
2. `docker compose up -d --build`
3. `docker compose ps`
4. `docker compose logs -f backend`
5. `docker compose down -v`

### محدودیت صریح
`flutter_web` فقط برای QA و تست UI/API است. خروجی Android/iOS در Compose تولید نمی‌شود و باید در CI/CD ساخته شود.

## 10) محیط‌ها، Secrets، Config Matrix

### فایل محیط
فایل پایه: `.env.example` (در ریشه ریپو)

### کلیدهای حداقلی
1. `APP_ENV`
2. `BACKEND_PORT`
3. `WEB_PORT`
4. `FLUTTER_WEB_PORT`
5. `POSTGRES_DB`
6. `POSTGRES_USER`
7. `POSTGRES_PASSWORD`
8. `REDIS_URL`
9. `MINIO_ENDPOINT`
10. `MINIO_ROOT_USER`
11. `MINIO_ROOT_PASSWORD`
12. `JWT_ACCESS_SECRET`
13. `JWT_REFRESH_SECRET`
14. `KAVENEGAR_API_KEY`
15. `ZARINPAL_MERCHANT_ID`
16. `ZARINPAL_CALLBACK_URL`
17. `LIVEKIT_URL`
18. `LIVEKIT_API_KEY`
19. `LIVEKIT_API_SECRET`
20. `COMMISSION_PERCENT`

### Config Matrix
1. Local Dev: سرویس‌ها داخل compose، secrets در `.env`.
2. Staging: compose یا VM، secrets از secret manager.
3. Production: خارج از scope MVP، ولی با همین contract قابل مهاجرت.

## 11) مانیتورینگ، لاگ، Healthcheck، Readiness

### مانیتورینگ پایه MVP
1. endpoint سلامت backend: `/healthz`
2. endpoint سلامت web: `/api/health`
3. متریک‌های پایه:
   - تعداد OTP درخواست/موفق/ناموفق
   - نرخ تبدیل رزرو
   - خطای پرداخت
   - نرخ جلسه تکمیل‌شده

### لاگ
1. JSON structured logging
2. فیلدهای اجباری: `timestamp`, `level`, `request_id`, `user_id`, `route`, `status_code`
3. Mask داده حساس: OTP, token, payment payload

## 12) برنامه تست و سناریوهای پذیرش

### سناریوهای اجباری
1. OTP موفق/ناموفق/Rate-limit
2. تکمیل پروفایل استاد + تایید/رد ادمین
3. جستجوی استاد با نام/تخصص
4. رزرو جلسه و جلوگیری از تداخل
5. پذیرش/رد درخواست توسط استاد
6. start/end جلسه با token معتبر LiveKit
7. top-up کیف پول و verify callback زرین‌پال
8. کسر هزینه + اعمال کمیسیون
9. ثبت برداشت + پردازش ادمین
10. امتیازدهی فقط پس از جلسه completed
11. بالا آمدن کامل compose و healthy شدن سرویس‌ها

### سطح تست
1. Unit Test برای سرویس‌های domain
2. Integration Test برای API + DB
3. E2E Test برای ۳ مسیر اصلی:
   - learner journey
   - teacher journey
   - admin journey

## 13) فازبندی اجرا (هفته‌ای) و معیار Done

### فاز 1: Auth + Role Model + Teacher Verification
1. OTP, JWT, roles, active role
2. پروفایل استاد و تایید ادمین

### فاز 2: Search + Booking Lifecycle
1. لیست و جزئیات اساتید
2. رزرو و پذیرش/رد

### فاز 3: Voice + Wallet + Commission
1. توکن LiveKit و lifecycle جلسه
2. شارژ کیف پول و کمیسیون

### فاز 4: Admin Workflows + Withdraw
1. مدیریت برداشت و گزارش اولیه
2. نوتیفیکیشن‌های ضروری

### فاز 5: Hardening
1. امنیت، لاگ، متریک، ریت‌لیمیت
2. تست بار سبک و رفع باگ

### Definition of Done (Delivery)
1. فایل `VODDA_3APP_BUILD_GUIDE.md` آماده و کامل باشد.
2. API contract + data model + compose spec + test scenarios + rollout phases پوشش داده شده باشد.
3. تصمیم باز باقی نماند.
4. ارجاع به `vodda.md` در ابتدای سند ثبت شده باشد.

## 14) ریسک‌ها و مسیر توسعه بعدی

### ریسک‌ها
1. تاخیر OTP provider یا محدودیت پیامکی
2. خطای callback پرداخت
3. کیفیت شبکه ضعیف در تماس صوتی
4. رشد سریع داده تراکنش بدون آرشیو

### کنترل ریسک
1. retry policy و circuit breaker برای OTP/Payment
2. idempotency key اجباری برای عملیات حساس
3. fallback در session lifecycle
4. index و partition plan برای جدول تراکنش در فاز بعدی

### مسیر بعد از MVP
1. افزودن جلسه تصویری
2. recommendation و فیلتر پیشرفته استاد
3. اتوماسیون تسویه استاد
4. مهاجرت استقرار به Kubernetes
