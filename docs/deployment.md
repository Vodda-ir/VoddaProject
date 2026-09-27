<div dir="rtl">

# دیپلوی وُدّا

## پیش‌نیازها

- روی ماشین محلی: Docker + Docker Compose، Node.js (برای خواندن `deploy.json`)، و برای دیپلوی از راه دور `sshpass` (و در صورت وجود `rsync`).
- روی سرور تازه: Ubuntu 26.04 amd64 و دسترسی SSH با root؛ `deploy.sh` پیش از deploy، Docker و Compose را از بسته‌های رسمی Ubuntu نصب و سرویس Docker را فعال می‌کند.

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
./deploy.sh setup     # فقط نصب Docker و Compose روی سرور
```

برای سرور ایران، نصب اولیه به‌طور پیش‌فرض از mirror رسمی کشوری Ubuntu (`ir.archive.ubuntu.com`) استفاده می‌کند و مخزن امنیتی Ubuntu را دست‌نخورده می‌گذارد. برای mirror دیگری می‌توان `UBUNTU_APT_MIRROR` را به URL مخزن Ubuntu تنظیم کرد. bundle فقط imageهای backend و frontend را دارد؛ MySQL و Node base از mirror عمومی Google روی خود سرور دریافت می‌شوند (با fallback به Docker Hub), و imageهای runtime و migration منافسه از source همان‌جا build می‌شوند. Prisma CLI فقط در image موقت migration است؛ بعد از به‌روزرسانی SQLite، این image حذف می‌شود تا وارد runtime یا bundle نشود. فایل `deploy.json` را با دسترسی محدود نگه دارید (`chmod 600 deploy.json`)؛ روش بهتر برای استفاده‌های بعدی، جایگزینی SSH password با کلید SSH است.

### مراحل `deploy`

1. **Build:** ایمیج‌های `vodda-backend:prod` و `vodda-frontend:prod` روی میزبان build ساخته و در bundle فشرده ذخیره می‌شوند.
2. **Transfer:** compose، `.env.production`، context کوچک منافسه و bundle با scp/rsync به سرور منتقل می‌شوند.
3. **Run:** روی سرور MySQL فقط در صورت نبود image از registry دریافت می‌شود، منافسه از source build می‌شود و imageهای برنامه load می‌شوند. پیش از start، image موقت Prisma schema را در volume موجود SQLite به‌روز می‌کند و سپس حذف می‌شود. Compose سرویس‌ها را با readiness بالا می‌آورد. اگر container قدیمی مستقل منافسه با نام `monafaseh` وجود داشته باشد، پیش از اتصال SQLite متوقف می‌شود؛ پس از سلامت سرویس جدید حذف می‌شود و در صورت شکست migration یا startup دوباره اجرا می‌شود. volumeهای داده با همان نام قبلی حفظ می‌شوند.

پس از دیپلوی، سرویس‌ها فقط روی loopback سرور در دسترس‌اند:

- Backend: `127.0.0.1:3420`
- Frontend: `127.0.0.1:3421`
- Monafaseh: `127.0.0.1:3423`

برای دسترسی عمومی، reverse-proxy با TLS لازم است؛ میزبان `vodda.ir` به frontend در ۳۴۲۱، میزبان API (برای مثال `api.vodda.ir`) به backend در ۳۴۲۰، و میزبان منافسه به `127.0.0.1:3423` پراکسی شود. DNS دامنه‌ها باید به IP همین سرور اشاره کند.

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
