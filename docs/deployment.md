<div dir="rtl">

# دیپلوی وُدّا

## پیش‌نیازها

- روی ماشین محلی: Docker + Docker Compose، Node.js (برای خواندن `deploy.json`)، و برای دیپلوی از راه دور `sshpass` (و در صورت وجود `rsync`).
- روی سرور: Docker + Docker Compose.

## فایل‌های پیکربندی

| فایل | کاربرد |
| --- | --- |
| `.env.local` | اجرای محلی دیباگ (`debug.sh`) |
| `.env.production` | مقادیر تولید (`deploy.sh`) — **محرمانه، در git نیست** |
| `deploy.json` | اطلاعات اتصال SSH سرور — **محرمانه، در git نیست** |

ساخت از روی نمونه‌ها:

```bash
cp .env.example .env.production
cp deploy.example.json deploy.json
```

مقادیر مهم تولید در `.env.production`:

- `JWT_SECRET` — یک مقدار قوی و تصادفی
- `DB_PASSWORD` — رمز قوی برای MySQL
- `SMS_API_KEY` و `SMS_BODY_ID` — اعتبارنامهٔ sms.ir
- `ZARINPAL_MERCHANT_ID` و `ZARINPAL_SANDBOX=false`
- `OTP_TEST_BYPASS_ENABLED=false` و `AUTO_SEED=false`
- `FRONTEND_BASE_URL`، `DOCKER_PLATFORM` (مثلاً `linux/amd64`)

ساختار `deploy.json`:

```json
{
  "ip": "SERVER_IP",
  "username": "root",
  "password": "SSH_PASSWORD",
  "path": "/www/wwwroot/vodda"
}
```

## دستورها

```bash
./deploy.sh build     # فقط build ایمیج‌های تولید + ساخت bundle فشرده
./deploy.sh deploy    # build + انتقال به سرور + اجرا  (پیش‌فرض)
./deploy.sh server    # فقط انتقال bundle موجود + اجرا روی سرور
```

### مراحل `deploy`

1. **Build:** ایمیج‌های `vodda-backend:prod` و `vodda-frontend:prod` ساخته و همراه `mysql:8.0` در `vodda-docker-bundle.tar.gz` ذخیره می‌شوند.
2. **Transfer:** فایل‌های `docker-compose.deploy.yml`، `.env.production` و bundle با scp/rsync به سرور منتقل می‌شوند.
3. **Run:** روی سرور `docker load` و سپس `docker compose -f docker-compose.deploy.yml --env-file .env.production up -d --pull never`.

پس از دیپلوی:

- Backend: `http://SERVER_IP:3420`
- Frontend: `http://SERVER_IP:3421`

> توصیه می‌شود جلوی سرویس‌ها یک reverse-proxy (مثل Nginx) با TLS قرار دهید و `/api/v1` را به ۳۴۲۰ و بقیه را به ۳۴۲۱ پراکسی کنید.

## اپ Flutter

اپ موبایل داکرایز نمی‌شود. برای انتشار:

```bash
cd app
flutter build apk --release --dart-define=API_BASE_URL=https://api.vodda.ir/api/v1
# یا appbundle برای Google Play
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.vodda.ir/api/v1
```

## نکات نگه‌داری

- دادهٔ MySQL در `./data/mysql` روی سرور persist می‌شود.
- `debug.sh reset` کانتینرها و volume محلی را پاک می‌کند (دادهٔ محلی از بین می‌رود).
- پشتیبان‌گیری: از پوشهٔ `data/mysql` یا با `mysqldump` از کانتینر MySQL.

</div>
