# سرویس پوستر کانال

تولید پوستر ۱۰۸۰×۱۰۸۰ بدون هیچ API خارجی — فقط Pillow + فونت‌های فارسی سایت.

## اجرا

```bash
docker build -t monafaseh-poster:prod /opt/monafaseh-poster
docker run -d --name monafaseh-poster --restart unless-stopped --network host \
  -e PORT=3430 monafaseh-poster:prod
```

## فراخوانی

```
GET http://127.0.0.1:3430/poster?title=...&wd=...&j=...&h=...&g=...
```

| پارامتر | معنا |
|---|---|
| title | عنوان/مناسبت (خالی = «محفل تلاوت قرآن کریم») |
| wd | روز هفته |
| j | تاریخ شمسی |
| h | تاریخ قمری |
| g | تاریخ میلادی |
| footer / tag | پابرگ و هشتگ (اختیاری) |

## نکات فنی

- شکل‌دهی فارسی با **libraqm** (نصب‌شده در ایمیج) انجام می‌شود؛ اگر در محیطی raqm نبود، خودکار به `arabic-reshaper` + `bidi` برمی‌گردد.
- فونت‌ها: `lalezar.ttf` (تیتر) و `baloo-bhaijaan-2-400.ttf` (متن) از `public/fonts` سایت.
- ارسال به ایتا با متد **sendFile** (فیلد `file` + `caption`) انجام می‌شود؛ `sendPhoto` در API ایتایار وجود ندارد.

## تست

```bash
curl -s "http://127.0.0.1:3430/poster?title=تست" -o /tmp/p.png && file /tmp/p.png
docker exec monafaseh-eitaa-bot node bot.mjs --test-photo
```
