<div dir="rtl">

# راهنمای عملیات production وُدّا

این سند برای استقرار، پایش، backup، restore و واکنش اولیه به رخدادهای محیط production است.

## پیش‌نیازها

- Docker Engine و Docker Compose v2
- reverse proxy با TLS معتبر
- دسترسی فقط-localhost به پورت‌های `3420`، `3421` و `3422`
- فضای پایدار برای `data/mysql`، `data/uploads` و `backups`
- secretهای منحصربه‌فرد و خارج از Git

متغیرهای الزامی:

```bash
MYSQL_ROOT_PASSWORD=...
DB_USER=vodda
DB_PASSWORD=...
DB_NAME=vodda
JWT_SECRET=<random-at-least-32-characters>
SMS_API_KEY=...
SMS_BODY_ID=...
FRONTEND_BASE_URL=https://vodda.ir
CORS_ALLOWED_ORIGINS=https://vodda.ir
```

در production این مقادیر باید همیشه خاموش باشند:

```bash
OTP_TEST_BYPASS_ENABLED=false
AUTO_SEED=false
DEV_WALLET_CHARGE_ENABLED=false
```

## استقرار

```bash
chmod +x docker-deploy.sh ops/*.sh
docker compose -f docker-compose.deploy.yml config
./docker-deploy.sh
```

پس از استقرار:

```bash
curl --fail http://127.0.0.1:3420/live
curl --fail http://127.0.0.1:3420/ready
curl --fail http://127.0.0.1:3421/
```

`/live` فقط زنده‌بودن process را گزارش می‌کند. `/ready` علاوه بر process، اتصال MySQL را نیز بررسی می‌کند و باید مبنای health check باشد.

## reverse proxy

- فقط frontend باید از اینترنت قابل دسترس باشد.
- مسیرهای `/api/backend/*` و `/api/auth/*` متعلق به BFF در Next.js هستند.
- Backend و MySQL نباید مستقیماً از اینترنت منتشر شوند.
- هدرهای `X-Forwarded-For` و `X-Forwarded-Proto` فقط از proxyهای تعریف‌شده در `TRUSTED_PROXIES` پذیرفته شوند.
- محدودیت دوم rate limit در reverse proxy یا Redis توصیه می‌شود؛ limiter داخلی از یک instance محافظت می‌کند.

## Backup روزانه

```bash
export DB_USER=vodda
export DB_PASSWORD='...'
export DB_NAME=vodda
RETENTION_DAYS=14 ./ops/mysql-backup.sh
```

خروجی شامل فایل فشرده و فایل SHA-256 است. نمونه cron برای ساعت ۰۳:۱۵:

```cron
15 3 * * * cd /srv/vodda && DB_USER=vodda DB_PASSWORD='...' DB_NAME=vodda ./ops/mysql-backup.sh >> /var/log/vodda-backup.log 2>&1
```

secret را مستقیماً داخل crontab قرار ندهید؛ از فایل environment با permission محدود یا secret manager استفاده کنید.

حداقل یک نسخه backup باید خارج از همان سرور، ترجیحاً در object storage با versioning و retention، نگهداری شود. کپی محلی به‌تنهایی در برابر خرابی دیسک یا حذف سرور کافی نیست.

## Restore

Restore destructive است و سرویس‌های backend و frontend را موقتاً متوقف می‌کند. اسکریپت پیش از restore یک backup ایمنی می‌گیرد مگر اینکه صریحاً غیرفعال شود.

```bash
export DB_USER=vodda
export DB_PASSWORD='...'
export DB_NAME=vodda
CONFIRM_RESTORE=vodda ./ops/mysql-restore.sh backups/vodda_YYYYMMDDTHHMMSSZ.sql.gz
```

پس از restore:

1. `/ready` را بررسی کنید.
2. ورود OTP، جستجوی استاد و خواندن کیف پول را smoke test کنید.
3. تعداد کاربران، جلسات، تراکنش‌ها و برداشت‌ها را با قبل از restore مقایسه کنید.
4. تا پایان reconciliation ترافیک مالی را باز نکنید.

Restore باید حداقل ماهی یک‌بار روی محیط staging تمرین شود؛ backupی که restore آن آزمایش نشده قابل اعتماد نیست.

## پایش و لاگ

Backend برای هر درخواست یک JSON log شامل `request_id`، method، route، status و latency تولید می‌کند. body، token و query values ثبت نمی‌شوند.

حداقل alertهای پیشنهادی:

- `/ready` ناموفق بیش از دو دقیقه
- نرخ پاسخ‌های `5xx` بالاتر از ۲٪ در پنج دقیقه
- افزایش `429` در OTP یا عملیات مالی
- backup ناموفق یا قدیمی‌تر از ۲۴ ساعت
- مصرف دیسک بالاتر از ۸۰٪
- رشد غیرعادی اختلاف ledger و balance

## رخداد مالی

در صورت مشاهده اختلاف موجودی یا callback تکراری:

1. مسیر پرداخت/برداشت را در reverse proxy موقتاً مسدود کنید.
2. snapshot دیتابیس و backup فوری بگیرید.
3. `request_id`، user، session/withdrawal ID و ledger entries را جمع‌آوری کنید.
4. هیچ balanceای را بدون ثبت ledger اصلاح نکنید.
5. پس از reconciliation و ثبت علت ریشه‌ای، مسیر مالی را باز کنید.

## محدودیت‌های باقی‌مانده

- شارژ production تا زمان پیاده‌سازی کامل request/callback/verify زرین‌پال عمداً غیرفعال است.
- تماس صوتی تا انتخاب provider و صدور token سمت سرور production-ready نیست.
- آپلودها اکنون MIME/size validation و volume پایدار دارند؛ انتقال به object storage برای چند replica همچنان لازم است.
- برای چند instance باید rate limit مشترک Redis/reverse proxy و storage مشترک استفاده شود.

</div>
