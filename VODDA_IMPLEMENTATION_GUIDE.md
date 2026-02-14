# دستورالعمل ساخت MVP وُدّا (سه‌اپی + اجرای یکپارچه با Docker)

این سند بر اساس `vodda.md` نوشته شده و با نیاز جدید شما هماهنگ شده است:
- ۳ اپ اصلی داریم:
1. بک‌اند با Go
2. وب‌اپ واحد برای لندینگ + فرانت وب + پنل ادمین
3. اپ Flutter واحد برای قرآن‌آموز + استاد (اپ جداگانه استاد نداریم)
- کل سرویس‌ها با یک فایل `docker-compose.yml` بالا می‌آیند.

## 1) خروجی نهایی MVP

خروجی MVP باید این قابلیت‌ها را پوشش دهد:
1. ثبت‌نام با OTP موبایل
2. پروفایل قرآن‌آموز و استاد
3. تایید دستی اساتید توسط ادمین
4. جستجو و مشاهده پروفایل اساتید
5. ثبت درخواست جلسه، پذیرش/رد توسط استاد
6. برگزاری جلسه صوتی آنلاین (نسخه MVP)
7. کیف پول، تراکنش، کارمزد پلتفرم
8. امتیازدهی و نظر بعد از جلسه
9. نوتیفیکیشن‌های اصلی
10. پنل ادمین برای مدیریت کاربران/اساتید/جلسات/برداشت‌ها

## 2) معماری کلان سیستم

### اپ‌ها
1. `apps/backend-go`:
   API مرکزی، منطق کسب‌وکار، احراز هویت، رزرو، کیف پول، ادمین.
2. `apps/web`:
   یک اپ وب (پیشنهاد: Next.js) با ۳ ناحیه:
   - `"/"` لندینگ
   - `"/app/*"` فرانت کاربر (نسخه وب)
   - `"/admin/*"` پنل ادمین
3. `apps/mobile-flutter`:
   اپ واحد Flutter برای هر دو نقش قرآن‌آموز و استاد با Role-Based UI.

### سرویس‌های زیرساختی
1. `PostgreSQL`: دیتابیس اصلی
2. `Redis`: کش، صف سبک، OTP Rate Limit
3. `MinIO` (یا S3): ذخیره فایل (عکس پروفایل، نمونه صوت)
4. `Nginx` (اختیاری): Reverse Proxy در محیط Production

## 3) تصمیم مهم محصول (بر اساس درخواست شما)

اپ Flutter یک اپ واحد است:
1. کاربر بعد از ورود، نقش فعال خود را می‌بیند (Learner/Teacher).
2. اگر نقش `Teacher` هم داشته باشد، از داخل همان اپ بین داشبوردها سوییچ می‌کند.
3. تمام APIها role-aware هستند، نه app-aware.

نتیجه: نگهداری ساده‌تر، انتشار سریع‌تر، هزینه کمتر.

## 4) ساختار پیشنهادی Monorepo

```text
VoddaProject/
  apps/
    backend-go/
      cmd/api/
      internal/
      migrations/
      Dockerfile
    web/
      app/
      public/
      Dockerfile
    mobile-flutter/
      lib/
      pubspec.yaml
      Dockerfile
  infra/
    docker-compose.yml
    .env.example
```

نکته: یک فایل Compose مرکزی در `infra/docker-compose.yml` کل سیستم را بالا می‌آورد.

## 5) طراحی بک‌اند Go

### استک پیشنهادی
1. Go 1.23+
2. Fiber یا Gin
3. PostgreSQL + `sqlc` یا `gorm`
4. Redis
5. JWT (access/refresh) + OTP login

### ماژول‌ها
1. `auth`: OTP، توکن، خروج
2. `users`: پروفایل و نقش‌ها
3. `teachers`: تکمیل پروفایل استاد + تایید ادمین
4. `search`: جستجو بر اساس نام/تخصص
5. `bookings`: درخواست/پذیرش/رد جلسه
6. `sessions`: lifecycle جلسه صوتی
7. `wallet`: شارژ، کسر، کمیسیون، برداشت
8. `ratings`: ستاره و نظر
9. `notifications`: درون‌برنامه‌ای + Push
10. `admin`: گزارش، مدیریت، تاییدها

### API های MVP (حداقل)
1. `POST /auth/request-otp`
2. `POST /auth/verify-otp`
3. `GET /me`
4. `PATCH /me/profile`
5. `POST /teachers/profile`
6. `GET /teachers?query=&specialty=`
7. `GET /teachers/:id`
8. `POST /bookings`
9. `POST /bookings/:id/accept`
10. `POST /bookings/:id/reject`
11. `POST /sessions/:id/start`
12. `POST /sessions/:id/end`
13. `POST /wallet/topup`
14. `POST /wallet/withdraw-request`
15. `POST /ratings`
16. `GET /admin/teachers/pending`
17. `POST /admin/teachers/:id/approve`
18. `POST /admin/teachers/:id/reject`

## 6) طراحی وب‌اپ (Landing + Front + Admin)

### استک پیشنهادی
1. Next.js (App Router)
2. React + TypeScript
3. Tailwind CSS

### مسیرها
1. لندینگ:
   - `/`
   - `/about`
   - `/teachers`
2. فرانت وب:
   - `/app/dashboard`
   - `/app/bookings`
   - `/app/wallet`
3. ادمین:
   - `/admin/login`
   - `/admin/teachers/pending`
   - `/admin/withdrawals`
   - `/admin/reports`

## 7) طراحی Flutter (اپ واحد کاربر + استاد)

### اصل طراحی
1. یک اپ واحد، یک Build، یک Login
2. UI و Navigation بر اساس نقش فعال
3. سوییچ نقش داخل Settings/Profile

### ماژول‌های Flutter
1. `auth`
2. `home`
3. `teacher_profile_setup`
4. `teacher_requests`
5. `booking`
6. `session_voice`
7. `wallet`
8. `rating`
9. `notifications`

### نکته فنی جلسه صوتی
برای MVP، پیاده‌سازی تماس صوتی از طریق WebRTC SDK (مثل LiveKit/Agora/Twilio) سریع‌تر از پیاده‌سازی خام است.

## 8) دیتابیس (جداول هسته MVP)

1. `users`
2. `user_roles`
3. `teacher_profiles`
4. `teacher_media`
5. `bookings`
6. `sessions`
7. `wallets`
8. `transactions`
9. `withdraw_requests`
10. `ratings`
11. `notifications`

## 9) اجرای همه چیز با یک Docker Compose

در `infra/docker-compose.yml` سرویس‌های زیر را تعریف کنید:
1. `backend` (Go API)
2. `web` (Next.js)
3. `flutter` (Flutter web dev/proxy build for QA)
4. `postgres`
5. `redis`
6. `minio`

نمونه:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: vodda
      POSTGRES_USER: vodda
      POSTGRES_PASSWORD: vodda
    ports: ["5432:5432"]
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: vodda
      MINIO_ROOT_PASSWORD: vodda123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  backend:
    build: ../apps/backend-go
    env_file: .env
    depends_on: [postgres, redis, minio]
    ports: ["8080:8080"]

  web:
    build: ../apps/web
    env_file: .env
    depends_on: [backend]
    ports: ["3000:3000"]

  flutter:
    build: ../apps/mobile-flutter
    env_file: .env
    depends_on: [backend]
    ports: ["8081:80"]

volumes:
  pg_data:
  minio_data:
```

### دستورات اجرا
1. `cd infra`
2. `cp .env.example .env`
3. `docker compose up -d --build`

## 10) Dockerfile حداقلی هر اپ

1. `apps/backend-go/Dockerfile`:
   Multi-stage build برای باینری Go
2. `apps/web/Dockerfile`:
   Build Next.js و اجرای `next start`
3. `apps/mobile-flutter/Dockerfile`:
   Build Flutter web و سرو با Nginx

نکته: اپ Flutter موبایل (Android/iOS) از Docker اجرا نمی‌شود، اما نسخه Flutter Web برای QA با Compose بالا می‌آید. خروجی APK/IPA در CI ساخته می‌شود.

## 11) برنامه فازبندی اجرا (پیشنهاد عملی)

1. فاز ۱ (هفته ۱-۲):
   Auth OTP، پروفایل‌ها، تایید استاد
2. فاز ۲ (هفته ۳-۴):
   جستجو، رزرو، پذیرش/رد
3. فاز ۳ (هفته ۵-۶):
   جلسه صوتی MVP + کیف پول و کمیسیون
4. فاز ۴ (هفته ۷):
   امتیازدهی، نوتیفیکیشن، پنل ادمین کامل
5. فاز ۵ (هفته ۸):
   تست نهایی، مانیتورینگ، آماده‌سازی انتشار

## 12) معیار پذیرش تحویل (Definition of Done)

1. هر سه اپ با `docker compose up --build` قابل اجرا باشند.
2. مسیر کامل کاربر: ثبت‌نام → رزرو → جلسه → پرداخت → امتیاز ثبت شود.
3. مسیر کامل استاد: تکمیل پروفایل → تایید ادمین → پذیرش جلسه → درخواست برداشت.
4. ادمین بتواند تایید استاد و مدیریت برداشت را انجام دهد.
5. لاگ خطا، health-check و migration دیتابیس فعال باشد.

