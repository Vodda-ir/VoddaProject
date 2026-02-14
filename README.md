# پروژه وُدّا

پلتفرم آموزش قرآن و مداحی — سه اپ با معماری کلین و ماژولار.

## ساختار پروژه

```
VoddaProject/
├── backend/          # Go + Gin + MySQL
│   ├── main.go
│   └── src/
│       ├── config/
│       ├── database/
│       ├── models/
│       ├── controllers/
│       └── services/
├── main/             # Next.js (وب)
├── app/              # Flutter + Riverpod (موبایل)
├── docker-compose.yml
├── .env.example
└── cursor_ins.md     # دستورالعمل ساخت
```

## پیش‌نیازها

- Docker و Docker Compose
- (اختیاری) Go 1.23+، Node.js 20+، Flutter برای اجرای لوکال

## راه‌اندازی با Docker

1. کپی تنظیمات محیط:

```bash
cp .env.example .env
```

2. بالا آوردن سرویس‌ها:

```bash
docker compose up -d --build
```

3. وضعیت سرویس‌ها:

```bash
docker compose ps
```

4. توقف و پاک‌سازی:

```bash
docker compose down -v
```

## آدرس‌ها

- Backend: http://localhost:5566
- Web (main): http://localhost:5567
- App (Flutter): http://localhost:5568

## اجرای لوکال (بدون Docker)

1. MySQL را اجرا کنید (یا از Docker فقط برای mysql استفاده کنید).
2. تنظیمات را در `.env` قرار دهید.

**Backend:**
```bash
cd backend
go mod download
go run .
```

**Web (main):**
```bash
cd main
npm install
npm run dev
```

**Flutter (app):**
```bash
cd app
flutter pub get
flutter run -d web-server --web-port=5568
```

## APIهای پایه

- `GET /healthz` — سلامت سرویس
- `POST /auth/request-otp` — درخواست OTP (کد تست: 123456)
- `POST /auth/verify-otp` — تایید OTP و دریافت token

## مستندات

- `cursor_ins.md`: دستورالعمل ساخت پروژه
- `vodda.md`: نیازمندی‌های MVP
- `VODDA_3APP_BUILD_GUIDE.md`: راهنمای تفصیلی
