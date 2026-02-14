# دستورالعمل ساخت پروژه وُدّا

راهنمای ساده برای ساخت پروژه با سه اپ در پوشه روت، معماری کلین و ماژولار.

---

## 1. ساختار پوشه‌ها

```
VoddaProject/
├── backend/          # اپ Go
├── main/             # اپ Next.js
├── app/              # اپ Flutter
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 2. بک‌اند Go

### ساختار
```
backend/
├── main.go
└── src/
    ├── config/      # تنظیمات
    ├── database/    # اتصال و migration
    ├── models/      # مدل‌های GORM
    ├── controllers/ # هندلرهای HTTP
    └── services/     # منطق کسب‌وکار و repository
```

### پشته فنی
- Go 1.23+
- Gin
- MySQL (driver: go-sql-driver/mysql)
- sqlc برای کوئری‌ها

### دیتابیس
- MySQL (بدون PostgreSQL، Redis، MinIO)

---

## 3. وب Next.js (main)

### ساختار ماژولار
```
main/
├── app/              # App Router
│   ├── (landing)/     # صفحه اصلی
│   ├── app/           # پنل کاربر
│   └── admin/         # پنل ادمین
├── components/
├── lib/
│   ├── api/           # API client
│   └── hooks/
└── features/          # ماژول‌های feature-based (اختیاری)
```

### پشته فنی
- Next.js (App Router)
- TypeScript
- Tailwind CSS

### مسیرها
- Landing: `/`, `/about`, `/teachers`
- User: `/app/dashboard`, `/app/bookings`, `/app/wallet`, `/app/profile`
- Admin: `/admin/login`, `/admin/teachers/pending`, `/admin/withdraw-requests`

---

## 4. اپ Flutter (app)

### ساختار ماژولار
```
app/
├── lib/
│   ├── core/          # shared
│   │   ├── api/
│   │   ├── theme/
│   │   └── router/
│   ├── features/
│   │   ├── auth/
│   │   ├── home/
│   │   ├── teacher_profile/
│   │   ├── booking/
│   │   ├── session/
│   │   ├── wallet/
│   │   ├── rating/
│   │   └── notifications/
│   └── main.dart
└── pubspec.yaml
```

### پشته فنی
- Flutter
- Riverpod (مدیریت state)

### ویژگی‌ها
- یک اپ برای learner و teacher
- سوییچ نقش از طریق `active_role`

---

## 5. دیتابیس MySQL

### جداول اصلی
- `users`, `user_roles`
- `teacher_profiles`, `teacher_media`, `availability_slots`
- `bookings`, `sessions`
- `wallets`, `transactions`, `withdraw_requests`
- `ratings`, `notifications`, `otp_requests`

### Migration
Migration با **GORM AutoMigrate** و بر اساس مدل‌های تعریف‌شده در `backend/internal/models/` انجام می‌شود. هنگام اجرای بک‌اند، جداول به‌طور خودکار ایجاد یا به‌روزرسانی می‌شوند.

---

## 6. Docker Compose

```yaml
version: "3.9"
name: vodda

services:
  mysql:
    image: mysql:8
    container_name: vodda_mysql
    environment:
      MYSQL_DATABASE: ${MYSQL_DATABASE:-vodda}
      MYSQL_USER: ${MYSQL_USER:-vodda}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-vodda}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-vodda}
    ports:
      - "${MYSQL_PORT:-3306}:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - vodda_net

  backend:
    build:
      context: ./backend
    container_name: vodda_backend
    env_file:
      - .env
    depends_on:
      mysql:
        condition: service_healthy
    ports:
      - "${BACKEND_PORT:-5566}:8080"
    networks:
      - vodda_net

  main:
    build:
      context: ./main
    container_name: vodda_main
    env_file:
      - .env
    depends_on:
      - backend
    ports:
      - "${MAIN_PORT:-5567}:3000"
    networks:
      - vodda_net

volumes:
  mysql_data:

networks:
  vodda_net:
    driver: bridge
```

---

## 7. مراحل اجرا

1. `cp .env.example .env`
2. مقادیر دیتابیس و JWT را در `.env` تنظیم کن
3. `docker compose up -d --build`
4. برای اجرای لوکال بدون Docker:
   - بک‌اند: `cd backend && go run ./cmd/api`
   - وب: `cd main && npm run dev`
   - فلاتر: `cd app && flutter run`

---

## 8. متغیرهای محیط (.env.example)

```
# App
APP_ENV=development

# Ports
BACKEND_PORT=5566
MAIN_PORT=5567
APP_PORT=5568
MYSQL_PORT=3306

# MySQL
MYSQL_DATABASE=vodda
MYSQL_USER=vodda
MYSQL_PASSWORD=vodda
MYSQL_ROOT_PASSWORD=vodda

# JWT
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret

# سرویس‌های خارجی (بعداً)
# KAVENEGAR_API_KEY=
# ZARINPAL_MERCHANT_ID=
# LIVEKIT_URL=
# LIVEKIT_API_KEY=
```

---

## 9. APIهای پایه بک‌اند

| Method | Endpoint | توضیح |
|--------|----------|--------|
| POST | `/auth/request-otp` | درخواست OTP |
| POST | `/auth/verify-otp` | تایید OTP و دریافت token |
| GET | `/me` | پروفایل کاربر |
| PATCH | `/me/profile` | ویرایش پروفایل |
| POST | `/me/active-role` | تعیین نقش فعال |
| POST | `/teacher/profile` | پروفایل استاد |
| GET | `/teachers` | لیست اساتید |
| GET | `/teachers/:id` | جزئیات استاد |
| POST | `/bookings` | ثبت رزرو |
| POST | `/bookings/:id/accept` | قبول رزرو |
| POST | `/bookings/:id/reject` | رد رزرو |
| POST | `/sessions/:id/token` | دریافت توکن جلسه |
| POST | `/wallet/topup/initiate` | شروع شارژ |
| POST | `/wallet/topup/verify` | تایید شارژ |
| POST | `/ratings` | ثبت امتیاز |

---

## 10. نکات مهم

1. **ساده نگه داشتن**: از اضافه کردن لایه‌ها و ابزارهای غیرضروری خودداری کن.
2. **ماژولار**: هر feature در ماژول جداگانه، با domain و usecase مشخص.
3. **کلین**: separation واضح بین domain، usecase و delivery (handler/repo).
4. **MySQL**: فقط MySQL؛ بدون PostgreSQL، Redis یا MinIO در مرحله اول.
