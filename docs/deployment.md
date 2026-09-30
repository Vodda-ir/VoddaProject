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
| `deploy.json` | اطلاعات اتصال SSH و نگاشت دامنه‌ها — **محرمانه، در git نیست** |

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
- `CORS_ALLOWED_ORIGINS` شامل وب و WebView بومی؛ مقادیر فعلی `.env.production` شامل `vodda.ir`، `app.vodda.ir`، `https://localhost` و `capacitor://localhost` است.
- `UNIVERSAL_APP_ROOT_HOST=app.vodda.ir` برای mount همزمان Universal App در ریشهٔ ساب‌دامین و زیر `/app` سایت اصلی.

ساختار `deploy.json`:

```json
{
  "ip": "SERVER_IP",
  "username": "root",
  "password": "SSH_PASSWORD",
  "path": "/www/wwwroot/vodda",
  "domains": {
    "site": "vodda.ir",
    "app": "app.vodda.ir",
    "api": "api.vodda.ir",
    "monafaseh": "monafeseh.ir"
  }
}
```

## دستورها

```bash
./deploy.sh build     # فقط build ایمیج‌های تولید + ساخت bundle فشرده
./deploy.sh deploy    # build + انتقال به سرور + اجرا  (پیش‌فرض)
./deploy.sh server    # فقط انتقال bundle موجود + اجرا روی سرور
./deploy.sh setup     # فقط نصب Docker و Compose روی سرور
./deploy.sh domains   # build Backend/Frontend و اعمال دامنه‌ها، بدون schema migration
./deploy.sh proxy     # بازاعمال Nginx بدون build یا restart اپ‌ها
```

برای تغییر دامنه و BFF از `domains` استفاده کنید؛ این مسیر فقط سرویس‌های backend، frontend و منافسه را با image/config جدید بالا می‌آورد و Prisma migrator را اجرا نمی‌کند. volume دیتابیس‌ها حفظ می‌شوند.

برای سرور ایران، نصب اولیه به‌طور پیش‌فرض از mirror رسمی کشوری Ubuntu (`ir.archive.ubuntu.com`) استفاده می‌کند و مخزن امنیتی Ubuntu را دست‌نخورده می‌گذارد. برای mirror دیگری می‌توان `UBUNTU_APT_MIRROR` را به URL مخزن Ubuntu تنظیم کرد. bundle فقط imageهای backend و frontend را دارد؛ MySQL و Node base از mirror عمومی Google روی خود سرور دریافت می‌شوند (با fallback به Docker Hub), و imageهای runtime و migration منافسه از source همان‌جا build می‌شوند. Prisma CLI فقط در image موقت migration است؛ بعد از به‌روزرسانی SQLite، این image حذف می‌شود تا وارد runtime یا bundle نشود. فایل `deploy.json` را با دسترسی محدود نگه دارید (`chmod 600 deploy.json`)؛ روش بهتر برای استفاده‌های بعدی، جایگزینی SSH password با کلید SSH است.

### مراحل `deploy`

1. **Build:** ایمیج‌های `vodda-backend:prod` و `vodda-frontend:prod` روی میزبان build ساخته و در bundle فشرده ذخیره می‌شوند.
2. **Transfer:** compose، `.env.production`، context کوچک منافسه و bundle با scp/rsync به سرور منتقل می‌شوند.
3. **Run:** deploy کامل runtime منافسه را از source می‌سازد و پیش از start، migrator Prisma schema SQLite را sync می‌کند. مسیر `domains` image موجود منافسه را با همان volume اجرا می‌کند و هیچ schema migration دیتابیس ودا یا منافسه ندارد. هر دو مسیر readiness سرویس‌ها را بررسی می‌کنند.

پس از deploy، Nginx روی سرور براساس hostname درخواست را مسیریابی می‌کند. در Arvan، origin هر hostname باید IP همین سرور باشد، TLS و اجبار HTTPS در لبه فعال باشد، و ارتباط Arvan با origin روی HTTP پورت ۸۰ انجام شود. Compose پورت‌های سرویس را فقط روی loopback نگه می‌دارد:

- Backend: `127.0.0.1:3420`
- Frontend: `127.0.0.1:3421`
- MySQL: `127.0.0.1:3422`
- Monafaseh: `127.0.0.1:3423`

نگاشت hostnameها: `vodda.ir` به frontend، `app.vodda.ir` به همان frontend با rewrite داخلی `/` به `/app`، `api.vodda.ir` به backend، و `monafeseh.ir` به منافسه. پورت‌های ۳۴۲۰ تا ۳۴۲۳ برای دسترسی عمومی منتشر نمی‌شوند.

## اپ Capacitor

اپ موبایل داکرایز نمی‌شود و `frontend/native/.env.production` آدرس API تولید را دارد. برای build و sync:

```bash
cd frontend/native
npm run build
npx cap sync
```

Flutter deprecated reference است؛ build محصول جدید از wrapper Capacitor و Universal App استفاده می‌کند.

## نکات نگه‌داری

- دادهٔ MySQL در `./data/mysql` روی سرور persist می‌شود.
- `debug.sh reset` دیتابیس MySQL ودا را reset می‌کند؛ volumeهای SQLite و uploads منافسه را نگه می‌دارد.
- دادهٔ MySQL ودا در `./data/mysql` ذخیره می‌شود. SQLite و uploads منافسه در Docker volumes با نام‌های `monafaseh_monafaseh-db` و `monafaseh_monafaseh-uploads` نگه‌داری می‌شوند.
- پشتیبان‌گیری: از پوشهٔ `data/mysql` یا با `mysqldump` برای ودا؛ از volumeهای منافسه پیش از حذف دستی Docker volumeها backup بگیرید.

</div>
