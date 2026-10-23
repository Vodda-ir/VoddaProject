# ربات کانال ایتا (منافسه)

این سرویس روی سرور به‌صورت کانتینر داکری اجرا می‌شود.

- کد روی سرور: `/opt/monafaseh-bot/bot.mjs` و `content.mjs`
- توکن: `/opt/monafaseh-bot/token` (chmod 600 — هرگز کامیت نشود)
- وضعیت و دی‌دوپلیکیشن: `/opt/monafaseh-bot/state.json`
- ایمیج: `node:22-alpine`

## اجرا

```bash
docker run -d --name monafaseh-eitaa-bot --restart unless-stopped --network host \
  -v /opt/monafaseh-bot:/app -w /app \
  -e STATE_FILE=/app/state.json -e TOKEN_FILE=/app/token \
  node:22-alpine node bot.mjs
```

## زمان‌بندی (Asia/Tehran)

| ساعت | پیام |
|---|---|
| ۰۹:۰۰ | صبح منافسه (تاریخ شمسی/قمری + مناسبت + آیه) |
| ۱۲:۳۰ | معرفی قابلیت — وعده اول |
| ۱۷:۳۰ | معرفی قابلیت — وعده دوم |
| ۲۱:۰۰ | پیام شب (جمعه‌ها: پیام شب جمعه) |

## ماژول رویدادمحور

هر ۹۰ ثانیه `GET /api/public/live-rooms` را می‌خواند و در صورت وجود رویداد جدید
(در بازه ۰۹:۰۰ تا ۲۳:۰۰، حداکثر ۴ پیام در روز، با دی‌دوپلیکیشن بر اساس `id`) پیام می‌فرستد.

## دستورهای کاربردی

```bash
docker logs monafaseh-eitaa-bot --tail 50
docker exec monafaseh-eitaa-bot node bot.mjs --dry-run --once --slot 09:00
docker exec monafaseh-eitaa-bot node bot.mjs --test-send
docker restart monafaseh-eitaa-bot
```
