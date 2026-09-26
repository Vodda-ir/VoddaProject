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
- `MONAFASEH_NEXTAUTH_SECRET` (در صورت خالی بودن از `JWT_SECRET` استفاده می‌شود)، `MONAFASEH_NEXTAUTH_URL`، `MONAFASEH_SITE_URL` و در صورت نیاز `MONAFASEH_BOT_TOKEN`
- `MONAFASEH_PORT` (پیش‌فرض `3423`)

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

1. **Build:** ایمیج‌های `vodda-backend:prod`، `vodda-frontend:prod` و `vodda-monafaseh:prod` ساخته و همراه `mysql:8.0` در `vodda-docker-bundle.tar.gz` ذخیره می‌شوند.
2. **Transfer:** فایل‌های `docker-compose.deploy.yml`، `.env.production` و bundle با scp/rsync به سرور منتقل می‌شوند.
3. **Run:** روی سرور imageها load می‌شوند و Compose ودا سرویس‌های برنامه و MySQL را با readiness بالا می‌آورد. اگر container قدیمی مستقل منافسه با نام `monafaseh` وجود داشته باشد، پیش از اتصال SQLite متوقف می‌شود؛ پس از سلامت سرویس جدید حذف می‌شود و در صورت شکست startup دوباره اجرا می‌شود. volumeهای داده با همان نام قبلی حفظ می‌شوند.

پس از دیپلوی:

- Backend: `http://SERVER_IP:3420`
- Frontend: `http://SERVER_IP:3421`
- Monafaseh upstream: `127.0.0.1:3423` (روی سرور فقط روی loopback منتشر می‌شود و برای دسترسی عمومی reverse proxy لازم است)

> توصیه می‌شود جلوی سرویس‌ها یک reverse-proxy (مثل Nginx) با TLS قرار دهید؛ `/api/v1` به ۳۴۲۰، سایت ودا به ۳۴۲۱ و دامنهٔ منافسه به `127.0.0.1:3423` پراکسی شود.

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
- `debug.sh reset` دیتابیس MySQL ودا را reset می‌کند؛ volumeهای SQLite و uploads منافسه را نگه می‌دارد.
- دادهٔ MySQL ودا در `./data/mysql` ذخیره می‌شود. SQLite و uploads منافسه در Docker volumes با نام‌های `monafaseh_monafaseh-db` و `monafaseh_monafaseh-uploads` نگه‌داری می‌شوند.
- پشتیبان‌گیری: از پوشهٔ `data/mysql` یا با `mysqldump` برای ودا؛ از volumeهای منافسه پیش از حذف دستی Docker volumeها backup بگیرید.

</div>
