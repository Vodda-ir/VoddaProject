# Public Website Redesign

آخرین بازبینی: 2026-09-21

## هدف

سطح عمومی وب وُدّا بعد از تکمیل visual parity اپ بازطراحی شد تا Landing، Search، Teacher Profile و صفحات محتوایی از همان زبان بصری Universal App استفاده کنند و بین سایت و اپ پرش بصری وجود نداشته باشد.

## Design language

- همان palette اصلی sand/olive/gold و فونت self-host شدهٔ `IRANYekanXFaNum`.
- container عمومی حداکثر 1180px با spacing و radiusهای نزدیک Universal App.
- Buttonهای مستطیلی با radius متوسط به‌جای pillهای بیش‌ازحد.
- Cardهای سبک با border کم‌رنگ و shadow محدود.
- حذف bottom-floating navigation سایت؛ mobile navigation به menu استاندارد داخل header تبدیل شد.
- Header sticky با blur کنترل‌شده و CTA مستقل «ورود به اپ».
- اعداد و کنترل‌های فرم همچنان با قواعد فارسی‌سازی و font inheritance مشترک frontend کار می‌کنند.

## Landing

Landing از نو compose شد:

- Hero جدید با headline کوتاه‌تر، search واقعی و CTAهای اپ/استاد.
- visual سمت Hero به‌جای emoji یا asset ساختگی، preview کدنویسی‌شده از UI واقعی اپ است.
- preview صراحتاً «نمونه رابط اپ» است و آمار مالی نمونه به‌عنوان داده واقعی نمایش داده نمی‌شود.
- دسته‌های قرآن/مداحی، سه مرحلهٔ کار، استادان تأییدشده، بخش شفافیت محصول و CTA استاد شدن بازطراحی شدند.
- Teacher cardهای Landing از نظر hierarchy به کارت استاد Universal نزدیک شدند.
- footer به ساختار چندستونهٔ منظم با لینک‌های محصول/شرکت/حقوقی تغییر کرد.

## Public conversion pages

- `/search`: Page Hero، search/filter surface، loading/error/empty state، grid استادان و pagination بازطراحی شدند.
- `/teachers/[id]`: profile hero، verified badge، metrics، about، services، reviews و booking card sticky بازطراحی شدند.
- مسیر رزرو و APIهای موجود تغییر نکرده‌اند.

## Content pages

صفحات زیر با `PublicPageHero` و surfaceهای مشترک بازطراحی شدند:

- About
- FAQ
- Contact
- Privacy
- Terms
- Blog
- Not Found / Error / Loading

محتوای factual صفحات حقوقی و FAQ تغییر ماهوی نکرده و redesign فقط presentation و hierarchy را تغییر داده است.

## قراردادهای حفظ‌شده

- Public site همچنان Next.js است.
- `/panel` از نظر flow و business logic تغییر نکرده است.
- Universal App و Capacitor architecture تغییر نکرده‌اند.
- teacher search و teacher detail همچنان داده واقعی backend را مصرف می‌کنند.
- هیچ capability غیرفعال به‌عنوان قابلیت فعال تبلیغ نشده است.
- هیچ build/test/npm install یا validation محیطی در این pass اجرا نشده است.
