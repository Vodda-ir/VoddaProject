# VoddaProject

ساختار پروژه الان این‌طوری است:

- `app/`: اپ Flutter قبلی، در همان جای خودش
- `web/`: نسخه‌ی جدید Laravel 13 با Blade + Livewire
- `legacy/original-monorepo/`: آرشیو نسخه‌ی قبلی Go / Next.js و مستندات مرتبط

## اجرای Laravel

برای کار روی نسخه‌ی Laravel برو داخل `web/`:

```bash
cd web
cp .env.example .env
touch database/database.sqlite
php artisan migrate --seed
composer dev
```

پیش‌نیاز مهم:

- `PHP 8.3+`
- `Composer 2+`
- افزونه‌های `pdo_sqlite` و `sqlite3`

نکته: در همین محیط فعلی، `pdo_sqlite` فعال نبود؛ برای همین migrate دیتابیس روی همین ماشین کامل اجرا نشد، ولی routeها، Bladeها، Livewire classها و تست‌های پایه بررسی شدند.

## یادداشت

درخواستت برای نگه داشتن Flutter داخل `app/` درست بود. ساختار را اصلاح کردم و Laravel را به `web/` منتقل کردم.
