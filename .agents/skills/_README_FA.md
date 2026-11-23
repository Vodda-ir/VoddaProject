# بسته Writing Skills فارسی

این بسته برای قرار گرفتن مستقیم داخل پوشه `.agents/skills/` آماده شده است.

## Skillها

1. `copywriting/`
   - پایه: `coreyhaines31/marketingskills`
   - کاربرد: Hero، headline، tagline، CTA، landing page، pricing/feature copy و متن بازاریابی سایت.
   - افزونه فارسی: `references/persian-copywriting.md`

2. `ux-writing-content-design/`
   - پایه: `hueyexe/frontend-agent-skills`
   - کاربرد: متن داخل محصول، button، label، form، onboarding، empty state، error، success، notification و microcopy.
   - افزونه فارسی: `references/persian-ux-writing.md`

3. `humanizer/`
   - پایه: `blader/humanizer`
   - کاربرد: مرحله نهایی برای حذف لحن کلیشه‌ای/ترجمه‌ای/بیش‌ازحد صیقلی و طبیعی‌تر کردن متن بدون تغییر واقعیت‌ها.
   - افزونه فارسی: `references/persian-humanizer.md`

## ترتیب پیشنهادی

### صفحه‌های مارکتینگ و سایت

`copywriting → humanizer`

اگر صفحه هم microcopy و interaction text دارد:

`copywriting → ux-writing-content-design → humanizer`

### داخل اپ و داشبورد

`ux-writing-content-design → humanizer`

در UX، Humanizer حق ندارد consistency اصطلاحات، معنای مالی/حقوقی، labelها یا دستور بازیابی از خطا را خراب کند.

## ارتباط با UI Pro

اگر پروژه `ui-pro` دارد، بعد از تصمیم‌های layout/visual، متن‌های قابل مشاهده کاربر باید با Skill مناسب بالا بازبینی شوند. برای صفحات product UI، `ux-writing-content-design` مقدم است؛ برای landing/marketing، `copywriting` مقدم است.

## نصب

محتویات ZIP را داخل این مسیر extract کنید:

```text
.agents/skills/
```

بعد از extract باید این مسیرها وجود داشته باشند:

```text
.agents/skills/copywriting/SKILL.md
.agents/skills/ux-writing-content-design/SKILL.md
.agents/skills/humanizer/SKILL.md
```

## نکته فارسی

نسخه‌های upstream به تنهایی برای فارسی مفیدند اما کامل نیستند، چون بسیاری از مثال‌ها و نشانه‌های زبانی انگلیسی هستند. در این بسته هر Skill طوری patch شده که وقتی زبان فارسی است، reference فارسی خودش را به‌صورت اجباری بخواند.

## لایسنس

هر سه upstream تحت MIT هستند. فایل `LICENSE` و `SOURCE.md` داخل هر Skill نگه داشته شده است.
