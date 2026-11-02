# Vodda Web v2 — Static Site (REA Build)

نسخه جدید سایت وودّا (front-of-site) — خروجی بازسازی REA که از مخزن
`Vodda-ir/vodda2` (برنچ `rea/preview`) برداشت شده است.

## محتوا
- ۲۵ صفحه استاتیک کامل: `index`, `teacher`, `specialist`, `session`, `book`,
  `search`, `orders`, `ordercenter`, `payment`, `chat`, `credit`, `corporate`,
  `campaign`, `store`, `tokens`, `assessment`, `flags`, `legal`, `login`, `otp`,
  `profile`, `sitemap`, `curriculum`, `panel-admin`, `panel-teacher`
- کاملاً خوداتکا: `assets/` (css+js)، `fonts/` (IRANYekanXFaNum — ۵ وزن)، `img/`
- بدون نیاز به رانتایم سرور — فقط فایل استاتیک

## اجرای محلی
```bash
python3 -m http.server 8080 --directory web/
```

## استقرار روی سرور تولیدی (vodda.ir) — سیم‌کشی شده ✅
این پوشه به‌صورت خودکار در پایپ‌لاین `deploy.sh` لحاظ می‌شود:
- آپلود خودکار: `web/` → `/var/www/vodda-web` روی سرور (مرحله [7b/8] و فرمان جدید `web`)
- nginx (قالب `ops/nginx/vodda.conf.template`): دامنه اصلی سایت روی همین پوشه سرو می‌شود
- **fallback ایمن**: هر مسیری که فایل استاتیکی نداشته باشد (مثل پنل‌های کاربردی `/panel/*`) به
  فرانت‌اند قبلی پروکسی می‌شود → هیچ کارکردی از دست نمی‌رود؛ اگر هم پوشه web نباشد، سایت
  قدیمی سرو می‌شود (صفر قطعی)
- assetهای Next.js (`/_next/`، `/uploads/`) همیشه از فرانت‌اند قبلی می‌آیند

### فرمان‌های استقرار
```bash
bash deploy.sh web     # فقط سایت استاتیک جدید — سریع، بدون rebuild داکر (پیشنهادی)
bash deploy.sh         # استقرار کامل (ساخت ایمیج‌ها + همه سرویس‌ها)
```

## نکته فنی
آدرس assetها دارای پارامتر `?XTransformPort=3500` هستند (مربوط به درگاه محیط
پیش‌نمایش سندباکس). روی nginx تولیدی این پارامتر نادیده گرفته می‌شود و هیچ
تأثیری ندارد؛ در صورت تمایل به حذف کامل:
```bash
grep -rl 'XTransformPort=3500' web/ | xargs sed -i 's/?XTransformPort=3500//g'
```

## منبع حقیقت (Source of Truth)
- مخزن کاری: `github.com/Vodda-ir/vodda2` → برنچ `rea/preview` → پوشه `preview/`
- نسخه قبلی سایت: برنچ `backup/voddaproject2` (اسنپ‌شات کامل قبل از استقرار v2)
