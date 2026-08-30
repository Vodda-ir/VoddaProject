# قرارداد توسعه وُدّا

این فایل مرجع معماری برای agentها و توسعه‌دهندگان پروژه است. وضعیت مهاجرت اپ را از `docs/universal-app-migration-roadmap.md` بخوانید؛ آن فایل منبع حقیقت migration است. وضعیت کلی قابلیت‌ها در `CHECKLIST.md` نگه‌داری می‌شود.

## ساختار پروژه

### `backend/`
Backend اصلی با Go + Gin + MySQL است و مرجع authoritative برای وب، Universal App و Flutter reference باقی می‌ماند. زمان جلسه با `scheduled_at` به UTC نگه‌داری می‌شود و clientها برای نمایش زمان رسمی باید از `local_date`، `local_start` و `local_end` برگشتی backend استفاده کنند.

### `frontend/`
Next.js شامل صفحات public، پنل‌های موجود `/panel/...` و host وب Universal App است. migration اپ نباید public یا `/panel` را بشکند.

### `frontend/src/universal-app/`
سورس اصلی اپ جدید و مشترک بین web و native است.

قواعد ثابت:
- از `next/*` یا moduleهای server-only import نکنید.
- routeهای `/panel/...` را در Universal App hardcode نکنید.
- routing را از قرارداد مرکزی `router.ts` و helperهای route بسازید.
- `basePath` configurable بماند تا اپ هم زیر `/app/...` و هم بعداً در root ساب‌دامین قابل mount باشد.
- business componentها hostname را hardcode نکنند.
- UI اپ mobile-first، RTL و safe-area aware باشد و به layoutهای desktop پنل وابسته نشود.
- منطق business مشترک را در Universal App یا platform adapter نگه دارید؛ wrapper وب/native نباید implementation موازی ایجاد کند.

### `frontend/native/`
Wrapper Capacitor + Vite برای همان Universal App است.

قواعد ثابت:
- `appId` برابر `ir.vodda.vodda` باقی بماند.
- Capacitor فقط local generated bundle را load کند و `server.url` اضافه نشود.
- API native از config/env بومی گرفته شود.
- قابلیت‌های device از طریق `PlatformRuntime.capabilities` inject شوند؛ Universal Source مستقیماً Capacitor import نکند.

### `app/`
Flutter فعلی بعد از تکمیل parity کدنویسی نقش reference/fallback مهاجرت را دارد و فعلاً حذف نمی‌شود. حذف پوشه Flutter یا workflowهای آن فقط با تصمیم صریح انجام شود.

## Auth و Platform Adapter

Universal App باید تفاوت platform را پشت runtime مشترک نگه دارد.

### Web
- session با HttpOnly cookie حفظ شود.
- API از Next BFF عبور کند.
- token وب وارد browser storage یا business component نشود.
- config BFF/Auth باید deployment هم‌origin و same-site subdomain را پشتیبانی کند.

### Native
- Native مستقیماً Go API را مصرف می‌کند.
- token فقط در secure storage wrapper نگه‌داری شود.
- native adapter token را به Bearer authorization تبدیل کند.
- Universal App مستقیماً secure-storage یا Capacitor API را صدا نزند.

## Route contract اپ

```text
/app
/app/login
/app/search
/app/teacher/:id
/app/book/:id
/app/sessions
/app/wallet
/app/profile
/app/profile/edit
/app/t
/app/t/requests
/app/t/sessions
/app/t/services
/app/t/work-times
/app/t/wallet
/app/t/withdraw
/app/t/profile
/app/t/reviews
```

Namespace استاد فقط برای نقش‌های مجاز `teacher|admin` باز است. role switch فقط namespace/shell فعال را تغییر می‌دهد و نباید نقش سرور را mutation کند.

## قواعد domain و API

- فقط از endpoint و داده واقعی backend استفاده کنید؛ داده، آمار، تماس، درآمد، شارژ یا CTA ساختگی نسازید.
- availability رزرو authoritative است و بعد از conflict باید refresh شود.
- استاد نباید service را از client self-approve کند؛ moderation مدیر حفظ شود.
- backend مرجع نهایی validationهای مالی، برداشت، رزرو و permission است.
- زمان نمایشی session فقط از `local_*` رسمی backend گرفته شود.

## Deployment

Backend و frontend داکرایز می‌شوند. پورت‌های پروژه:
- backend: `3420`
- frontend: `3421`
- mysql: `3422`

قرارداد deployment Universal App برای حالت‌های `/app/...` و ساب‌دامین در `docs/universal-app-web-deployment.md` مستند است.

## قواعد اجرای migration

- قبل از کدنویسی roadmap را بخوانید و فقط اولین بسته منطقی ناتمام را انجام دهید.
- checkbox تکمیل‌شده را دوباره پیاده‌سازی نکنید؛ ابتدا وضعیت واقعی کد را بررسی کنید.
- public و `/panel` را دست‌نخورده نگه دارید.
- Universal Source را از `next/*` مستقل نگه دارید.
- Web auth را HttpOnly/BFF و Native auth را secure token/Bearer نگه دارید.
- `npm install`، build، test و Android/iOS build در scope فعلی migration شرط ادامه کدنویسی نیستند و بدون درخواست صریح اجرا نشوند.
- بعد از هر بسته، roadmap و در صورت اثرگذاری `CHECKLIST.md`، README یا docs را با وضعیت واقعی sync کنید.

## کیفیت کد

کد باید خوانا، ماژولار و قابل نگهداری باشد. از duplicate business logic، componentهای بسیار بزرگ، dependency پنهان بین `/panel` و Universal App و bypass کردن قرارداد backend خودداری کنید.