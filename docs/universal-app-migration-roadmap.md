# رودمپ مهاجرت اپ وُدّا به Universal Frontend + Capacitor

آخرین به‌روزرسانی: 2026-08-29

## هدف

اپ Flutter فعلی به یک Universal React Frontend منتقل شود که:

- صفحات عمومی سایت و روت‌های فعلی وب بدون تغییر باقی بمانند.
- اپ کاربر و استاد در namespace مستقل `/app/...` اجرا شود.
- routing اپ از `/panel/...` و صفحات public مستقل باشد.
- کامپوننت‌ها، مدل‌ها، API contractها و design primitives تا حد ممکن بین سایت/پنل/اپ مشترک باشند.
- سورس اپ به Next.js وابسته نباشد و Next فقط میزبان نسخه وب در `/app/...` باشد.
- همان سورس اپ بعداً با Capacitor برای Android/iOS بسته‌بندی شود.
- انتقال آینده از `vodda.ir/app/...` به `app.vodda.ir/...` بدون rewrite اپ انجام شود.
- محصول آنلاین است؛ offline-first، sync engine، IndexedDB mutation queue و service worker آفلاین جزو scope نیستند.

## قواعد ثابت معماری

1. صفحات public فعلی دست‌نخورده می‌مانند.
2. `/panel/...` فعلاً برای پنل‌های وب موجود باقی می‌ماند و migration اپ نباید آن را بشکند.
3. اپ جدید فقط زیر `/app/...` قرار می‌گیرد.
4. سورس universal app نباید از `next/*` import کند.
5. Web auth همان HttpOnly cookie + Next BFF فعلی را حفظ می‌کند.
6. Native auth از token امن و `Authorization: Bearer` استفاده می‌کند.
7. API و زمان جلسه همچنان از قرارداد authoritative بک‌اند استفاده می‌کنند؛ `scheduled_at` UTC و `local_date/local_start/local_end` برای نمایش.
8. `appId` نسخه Capacitor باید `ir.vodda.vodda` باقی بماند.
9. Capacitor باید local web bundle را اجرا کند؛ استفاده از `server.url` برای نمایش سایت آنلاین ممنوع است.
10. Flutter تا زمان تکمیل parity کدنویسی حذف نمی‌شود و نقش reference/fallback دارد.
11. Build و test در این roadmap شرط تکمیل کدنویسی نیستند و فعلاً اجرا نمی‌شوند.

---

## فاز 0 — تثبیت ساختار Universal App

- [x] ایجاد `frontend/src/universal-app/` به‌عنوان root سورس اپ.
- [x] تعریف entry مستقل React برای Universal App.
- [x] تعریف route config داخلی و مستقل از Next App Router.
- [x] ایجاد mount point در Next برای `/app/[[...path]]`.
- [x] جلوگیری از import مستقیم `next/navigation`، `next/link` و server-only modules در universal app.
- [x] تعریف base path قابل تنظیم برای حالت `/app` و حالت subdomain root.

**Done:** اپ از نظر source/routing یک واحد مستقل باشد و Next صرفاً host آن باشد.

## فاز 1 — Platform Adapter و Auth

- [x] تعریف interface مشترک برای platform runtime.
- [x] Web adapter برای BFF فعلی و HttpOnly session.
- [x] Native adapter برای direct Go API.
- [ ] Secure token storage برای native.
- [x] logout/login/session restore مشترک با implementation متفاوت در web/native.
- [x] API base URL configurable برای development/production/native.
- [x] حذف نیاز universal app به `getToken()` وب فعلی.

> قرارداد `SecureTokenStorage` و اتصال Bearer در native adapter پیاده شده است؛ implementation امن واقعی آن عمداً همراه Capacitor در فاز 7 اضافه می‌شود تا feature code به plugin مشخصی وابسته نشود.

**Done:** feature code بدون دانستن نوع platform بتواند authenticated API call انجام دهد.

## فاز 2 — Shared UI و Design System

- [x] استخراج color/token/typographyهای مشترک.
- [x] اشتراک `Icon` و primitiveهای عمومی مناسب app.
- [x] ایجاد componentهای پایه: Button، Input، Card، Avatar، EmptyState، ErrorState، LoadingState، Sheet/Dialog.
- [x] ایجاد app shell موبایل با bottom navigation.
- [x] ایجاد teacher app shell مستقل.
- [x] رعایت RTL و safe-area در ساختار اپ.
- [x] جلوگیری از وابستگی app UI به layoutهای desktop پنل وب.

> foundation این فاز در `frontend/src/universal-app/ui/` قرار دارد؛ tokenها مستقل از CSS سراسری Next هستند تا همان source در Vite/Capacitor هم قابل استفاده باشد. `MobileAppShell` و `TeacherAppShell` نیز در `ui/shells.tsx` ناوبری مستقل learner/teacher، active-route state، RTL و safe-area را بدون استفاده از layoutهای `/panel` فراهم می‌کنند.

**Done:** featureهای بعدی روی یک UI kit واحد و mobile-first ساخته شوند.

## فاز 3 — Auth و Onboarding اپ

- [x] انتقال صفحه launch/splash فعلی Flutter.
- [x] انتقال OTP request.
- [x] انتقال OTP verify.
- [x] redirect بر اساس session و role.
- [x] تکمیل profile در صورت `need_profile`.
- [ ] guard مسیرهای learner/teacher.
- [ ] role switch بین حساب قرآن‌آموز و استاد.

> `features/auth/AuthExperience.tsx` launch/session restore و OTP واقعی را روی runtime مشترک انجام می‌دهد. `ProfileCompletionScreen.tsx` نیز مسیر `need_profile -> /profile/edit` را با `PUT /me` برای نام، شهر و bio تکمیل می‌کند، session معتبر را restore می‌کند و بعد از ذخیره کاربر را به shell مناسب نقش هدایت می‌کند. guard دقیق learner/teacher و role-switch هنوز باز هستند.

**Done:** flow ورود Flutter از ابتدا تا ورود به shell مناسب در `/app/...` کامل باشد.

## فاز 4 — Learner App Parity

### Home
- [ ] انتقال header و وضعیت کاربر.
- [ ] انتقال hero جستجوی استاد.
- [ ] انتقال دسته‌های سریع قرآن/مداحی.
- [ ] انتقال اساتید پیشنهادی و استادان بانو.
- [ ] انتقال featured teacher.

### Search
- [ ] جستجوی server-side.
- [ ] debounce.
- [ ] فیلترهای واقعی بک‌اند.
- [ ] loading/empty/error/retry.

### Teacher Profile
- [ ] اطلاعات استاد.
- [ ] خدمات تأییدشده.
- [ ] نظرها و امتیاز واقعی.
- [ ] CTA رزرو.

### Booking
- [ ] انتخاب خدمت.
- [ ] دریافت availability authoritative از backend.
- [ ] انتخاب slot با `local_*`.
- [ ] ثبت رزرو.
- [ ] refresh availability بعد از conflict.

### Sessions
- [ ] upcoming/past.
- [ ] نمایش زمان رسمی backend.
- [ ] لغو جلسه.
- [ ] rating/review بعد از completion.

### Wallet
- [ ] موجودی.
- [ ] تاریخچه transaction.
- [ ] حذف هرگونه CTA ساختگی شارژ تا اتصال درگاه واقعی.

### Profile
- [ ] نمایش اطلاعات کاربر.
- [ ] ویرایش نام/شهر/bio.
- [ ] انتخاب و upload آواتار.
- [ ] لینک wallet.
- [ ] role switch برای teacher/admin.
- [ ] logout.

**Done:** تمام flowهای learner موجود در Flutter در `/app/...` parity کدنویسی داشته باشند.

## فاز 5 — Teacher App Parity

### Dashboard
- [ ] اطلاعات واقعی استاد.
- [ ] خلاصه جلسات.
- [ ] موجودی/امتیاز/review count واقعی.
- [ ] availability toggle در صورت پشتیبانی endpoint فعلی.

### Requests & Sessions
- [ ] درخواست‌های جلسه.
- [ ] accept.
- [ ] reject با reason.
- [ ] upcoming/past sessions.
- [ ] complete session.
- [ ] نمایش `local_*`.

### Services
- [ ] list services.
- [ ] create.
- [ ] edit.
- [ ] deactivate.
- [ ] delete.
- [ ] حفظ moderation policy؛ استاد نباید self-approve کند.

### Work Times
- [ ] list.
- [ ] create/update/delete طبق API فعلی.
- [ ] validation روز/ساعت.

### Wallet & Withdrawals
- [ ] موجودی و transactionها.
- [ ] withdrawal history.
- [ ] درخواست برداشت.
- [ ] validation کارت 16 رقمی / شبا `IR` + 24 رقم.

### Teacher Profile & Reviews
- [ ] پروفایل استاد.
- [ ] ویرایش داده‌های قابل ویرایش.
- [ ] reviews واقعی.
- [ ] role switch به learner.

**Done:** تمام flowهای teacher موجود در Flutter در Universal App پیاده شده باشند.

## فاز 6 — Route Contract نهایی

ساختار هدف:

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

- [ ] deep-link داخلی اپ مستقل از `/panel` باشد.
- [ ] refresh هر route روی Next mount درست resolve شود.
- [ ] helper مرکزی برای ساخت app URL ایجاد شود.
- [ ] هیچ component مشترکی routeهای `/panel/...` را hardcode نکند.

**Done:** app navigation کاملاً namespace-safe باشد.

## فاز 7 — Capacitor Scaffold

- [ ] ایجاد `frontend/native/` برای build wrapper.
- [ ] Vite entry از همان universal source.
- [ ] `capacitor.config.ts` با `appId = ir.vodda.vodda`.
- [ ] `webDir` روی local generated bundle.
- [ ] عدم استفاده از `server.url`.
- [ ] native API base URL از env/config.
- [ ] secure storage adapter.
- [ ] آماده‌سازی hooks برای Camera/Image Picker و قابلیت‌های native آینده.
- [ ] scripts لازم برای `native:dev`, `native:build`, `cap:sync`, `cap:android`, `cap:ios` در package config.

**Done:** کدنویسی scaffold native کامل باشد؛ generate/build واقعی platformها در scope فعلی نیست.

## فاز 8 — آمادگی `app.vodda.ir`

- [ ] base path اپ configurable باشد.
- [ ] asset pathها absolute و وابسته به `/app` نباشند.
- [ ] API origin configurable باشد.
- [ ] web auth adapter امکان same-site/subdomain deployment را در طراحی داشته باشد.
- [ ] document deployment برای دو حالت زیر:
  - `vodda.ir/app/...`
  - `app.vodda.ir/...`
- [ ] هیچ business componentی hostname را hardcode نکند.

**Done:** انتقال به subdomain صرفاً deployment/config change باشد.

## فاز 9 — Cleanup کدنویسی و Documentation

- [ ] به‌روزرسانی `AGENTS.md` با معماری جدید.
- [ ] به‌روزرسانی `README.md`.
- [ ] به‌روزرسانی `CHECKLIST.md`.
- [ ] مستند کردن mapping Flutter → Universal React.
- [ ] مستند کردن platform adapter contract.
- [ ] مستند کردن auth تفاوت web/native.
- [ ] حذف duplicate component/API codeهای ایجادشده در طول migration.
- [ ] علامت‌گذاری Flutter به‌عنوان deprecated reference بعد از تکمیل parity کدنویسی.
- [ ] حذف Flutter از workflowها فقط پس از تصمیم صریح برای حذف پوشه `app/`.

**Done:** سورس جدید قابل نگهداری باشد و agent/developer بعدی بتواند بدون رجوع به این گفتگو ادامه دهد.

---

## خارج از Scope فعلی

موارد زیر عمداً مانع تکمیل roadmap کدنویسی نیستند:

- `npm install` در محیطی که registry در دسترس نیست.
- `next build`، `vite build` و build Android/iOS.
- `flutter test` یا مقایسه runtime Flutter.
