# وُدّا - Laravel App

این پوشه شامل نسخه‌ی جدید وُدّا بر پایه‌ی `Laravel 13` است:

- بک‌اند: `Laravel 13`
- PHP هدف: `8.3+`
- فرانت وب: `Blade + Livewire`
- دیتابیس پیش‌فرض: `SQLite`

## قابلیت‌های فعلی

- ورود با OTP
- نقش‌های `learner`، `teacher` و `admin`
- پروفایل استاد و تأیید توسط ادمین
- جستجوی اساتید
- رزرو، پذیرش، رد و پایان جلسه
- کیف پول، شارژ آزمایشی، برداشت و تراکنش‌ها
- امتیازدهی و اعلان‌ها

## راه‌اندازی

```bash
cp .env.example .env
touch database/database.sqlite
php artisan migrate --seed
composer dev
```

یا:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

## کاربران نمونه

کد OTP پیش‌فرض: `12345`

- `09000000000` ادمین
- `09000000001` استاد تأییدشده
- `09000000002` قرآن‌آموز
- `09000000003` استاد در انتظار تأیید

## مسیرهای اصلی وب

- `/`
- `/about`
- `/teachers`
- `/login`
- `/app/dashboard`
- `/app/bookings`
- `/app/wallet`
- `/app/profile`
- `/teacher/dashboard`
- `/teacher/sessions`
- `/teacher/income`
- `/admin/teachers/pending`
- `/admin/withdraw-requests`

## API

API داخل همین اپ زیر پیشوند `/api` ارائه می‌شود و با Sanctum کار می‌کند.
