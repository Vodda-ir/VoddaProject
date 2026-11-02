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

## استقرار روی nginx (تولیدی)
```nginx
location / {
    root /var/www/vodda/web;   # همین پوشه web
    index index.html;
    try_files $uri $uri/ =404;
}
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
