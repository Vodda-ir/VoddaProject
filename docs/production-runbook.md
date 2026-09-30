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
SMS_PROVIDER=faraz
SMS_FARAZ_USERNAME=...
SMS_FARAZ_PASSWORD=...
SMS_FARAZ_FROM=3000505
SMS_FARAZ_PATTERN_CODE=j4skcu7fjd1jjjz
FRONTEND_BASE_URL=https://vodda.ir
CORS_ALLOWED_ORIGINS=https://vodda.ir,https://app.vodda.ir,https://localhost,capacitor://localhost
UNIVERSAL_APP_ROOT_HOST=app.vodda.ir
```

در production این مقادیر باید همیشه خاموش باشند:

```bash
OTP_TEST_BYPASS_ENABLED=false
AUTO_SEED=false
DEV_WALLET_CHARGE_ENABLED=false
```

## استقرار

```bash
chmod +x deploy.sh ops/*.sh
docker compose -f docker-compose.deploy.yml config
./deploy.sh
```

پس از استقرار:

```bash
curl --fail http://127.0.0.1:3420/live
curl --fail http://127.0.0.1:3420/ready
curl --fail http://127.0.0.1:3421/
```

`/live` فقط زنده‌بودن process را گزارش می‌کند. `/ready` علاوه بر process، اتصال MySQL را نیز بررسی می‌کند و باید مبنای health check باشد.

## domain reverse proxy

- Nginx در deploy، `vodda.ir` و `app.vodda.ir` را به frontend، `api.vodda.ir` را به backend، و `monafeseh.ir` را به منافسه هدایت می‌کند.
- TLS و اجبار HTTPS در لبهٔ Arvan فعال باشد؛ origin روی HTTP پورت ۸۰ سرور تنظیم شود.
- `app.vodda.ir` مسیرها را به catch-all فعلی Next زیر `/app` rewrite می‌کند و API، static و assetها را بدون rewrite عبور می‌دهد.
- مسیرهای وب `/api/backend/*` و `/api/auth/*` متعلق به BFF same-origin هستند. `api.vodda.ir/api/v1` برای Native و integration مستقیم است.
- Backend و MySQL فقط روی loopback هستند و Nginx به آن‌ها از همان میزبان وصل می‌شود.
- Nginx هدر host و proto بیرونی HTTPS را برای BFF می‌گذارد تا بررسی same-origin و کوکی Secure درست کار کنند.
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
