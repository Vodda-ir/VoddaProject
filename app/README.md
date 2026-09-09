# Flutter App — Deprecated Reference

> **وضعیت: Deprecated Reference**
>
> این پوشه فعلاً حذف نمی‌شود، اما دیگر source اصلی توسعهٔ اپ وُدّا نیست. منبع canonical قابلیت‌های اپ، `frontend/src/universal-app/` است و نسخهٔ native از همان source با wrapper واقع در `frontend/native/` ساخته می‌شود.

## قواعد نگه‌داری

- feature یا parity جدید را به‌صورت پیش‌فرض در Flutter پیاده‌سازی نکنید.
- برای bugfix یا تغییر محصول ابتدا Universal App را مرجع قرار دهید؛ تغییر Flutter فقط با درخواست صریح یا برای حفظ یک نیاز legacy مشخص انجام شود.
- این پوشه برای مراجعه به رفتار قدیمی، مقایسهٔ migration و تاریخچهٔ implementation نگه‌داری می‌شود.
- حذف `app/` یا حذف Flutter از workflowهای repository فقط با تصمیم صریح جداگانه مجاز است.
- وجود این پوشه نباید باعث ایجاد business logic موازی با Universal App شود.

Mapping کامل رفتارهای منتقل‌شده در `../docs/flutter-universal-mapping.md` و وضعیت migration در `../docs/universal-app-migration-roadmap.md` ثبت شده است.
