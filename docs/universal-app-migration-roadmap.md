# رودمپ مهاجرت اپ وُدّا به Universal Frontend + Capacitor

آخرین به‌روزرسانی: 2026-08-30

## هدف

اپ Flutter فعلی به یک Universal React Frontend منتقل شود که صفحات public و `/panel` فعلی را دست‌نخورده نگه دارد، اپ را فقط زیر `/app/...` اجرا کند، source آن از `next/*` مستقل باشد و همان source بعداً با Capacitor برای Android/iOS بسته‌بندی شود.

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
- [x] Secure token storage برای native.
- [x] logout/login/session restore مشترک با implementation متفاوت در web/native.
- [x] API base URL configurable برای development/production/native.
- [x] حذف نیاز universal app به `getToken()` وب فعلی.

> `SecureTokenStorage` در wrapper Capacitor با `@aparajita/capacitor-secure-storage` پیاده شده و native adapter همان token را فقط به‌صورت `Authorization: Bearer` روی API مستقیم مصرف می‌کند؛ Web همچنان HttpOnly/BFF باقی مانده است.

## فاز 2 — Shared UI و Design System

- [x] استخراج color/token/typographyهای مشترک.
- [x] اشتراک `Icon` و primitiveهای عمومی مناسب app.
- [x] ایجاد componentهای پایه: Button، Input، Card، Avatar، EmptyState، ErrorState، LoadingState، Sheet/Dialog.
- [x] ایجاد app shell موبایل با bottom navigation.
- [x] ایجاد teacher app shell مستقل.
- [x] رعایت RTL و safe-area در ساختار اپ.
- [x] جلوگیری از وابستگی app UI به layoutهای desktop پنل وب.

> foundation این فاز در `frontend/src/universal-app/ui/` قرار دارد و shellهای learner/teacher ناوبری مستقل از `/panel` دارند.

## فاز 3 — Auth و Onboarding اپ

- [x] انتقال صفحه launch/splash فعلی Flutter.
- [x] انتقال OTP request.
- [x] انتقال OTP verify.
- [x] redirect بر اساس session و role.
- [x] تکمیل profile در صورت `need_profile`.
- [x] guard مسیرهای learner/teacher.
- [x] role switch بین حساب قرآن‌آموز و استاد.

> `features/auth/` flow ورود، profile completion و role-mode switch را روی platform runtime مشترک اجرا می‌کند؛ namespace استاد فقط برای `teacher|admin` باز است.

## فاز 4 — Learner App Parity

### Home
- [x] انتقال header و وضعیت کاربر.
- [x] انتقال hero جستجوی استاد.
- [x] انتقال دسته‌های سریع قرآن/مداحی.
- [x] انتقال اساتید پیشنهادی و استادان بانو.
- [x] انتقال featured teacher.

### Search
- [x] جستجوی server-side.
- [x] debounce.
- [x] فیلترهای واقعی بک‌اند.
- [x] loading/empty/error/retry.

### Teacher Profile
- [x] اطلاعات استاد.
- [x] خدمات تأییدشده.
- [x] نظرها و امتیاز واقعی.
- [x] CTA رزرو.

### Booking
- [x] انتخاب خدمت.
- [x] دریافت availability authoritative از backend.
- [x] انتخاب slot با `local_*`.
- [x] ثبت رزرو.
- [x] refresh availability بعد از conflict.

### Sessions
- [x] upcoming/past.
- [x] نمایش زمان رسمی backend.
- [x] لغو جلسه.
- [x] rating/review بعد از completion.

### Wallet
- [x] موجودی.
- [x] تاریخچه transaction.
- [x] حذف هرگونه CTA ساختگی شارژ تا اتصال درگاه واقعی.

### Profile
- [x] نمایش اطلاعات کاربر.
- [x] ویرایش نام/شهر/bio.
- [x] انتخاب و upload آواتار.
- [x] لینک wallet.
- [x] role switch برای teacher/admin.
- [x] logout.

> parity learner در `frontend/src/universal-app/features/` با API واقعی، زمان رسمی backend و بدون داده/CTA ساختگی تکمیل شده است.

**Done:** تمام flowهای learner موجود در Flutter در `/app/...` parity کدنویسی داشته باشند.

## فاز 5 — Teacher App Parity

### Dashboard
- [x] اطلاعات واقعی استاد.
- [x] خلاصه جلسات.
- [x] موجودی/امتیاز/review count واقعی.
- [x] availability toggle در صورت پشتیبانی endpoint فعلی.

> `TeacherDashboardScreen.tsx` از `/me` و `/teacher/sessions?when=pending|upcoming` استفاده می‌کند. backend در `PUT /teacher/me` فیلد `available` را پشتیبانی می‌کند و toggle واقعی آن در پروفایل استاد در دسترس است تا mutation ساختگی یا duplicate در داشبورد ایجاد نشود.

### Requests & Sessions
- [x] درخواست‌های جلسه.
- [x] accept.
- [x] reject با reason.
- [x] upcoming/past sessions.
- [x] complete session.
- [x] نمایش `local_*`.

> `TeacherSessionsScreen.tsx` قرارداد واقعی `GET /teacher/sessions?when=pending|upcoming|past` و mutationهای accept/reject/complete را مصرف می‌کند و زمان فقط از `local_*` نمایش داده می‌شود.

### Services
- [x] list services.
- [x] create.
- [x] edit.
- [x] deactivate.
- [x] delete.
- [x] حفظ moderation policy؛ استاد نباید self-approve کند.

> `features/teacher/TeacherServicesScreen.tsx` route `/app/t/services` را از `GET /teacher/me -> data.services` پر می‌کند و create/edit/delete را روی `/teacher/services` انجام می‌دهد. deactivate فقط `active:false` می‌فرستد و هیچ مسیر یا کنترل client-side برای `active:true` وجود ندارد؛ service جدید یا ویرایش‌شده تا moderation مدیر قابل رزرو نیست. validation مدت ۱۰ تا ۲۴۰ دقیقه و قیمت مثبت با مرجع Flutter هم‌راستاست.

### Work Times
- [x] list.
- [x] create/update/delete طبق API فعلی.
- [x] validation روز/ساعت.

> `features/teacher/TeacherWorkTimesScreen.tsx` route `/app/t/work-times` را از `GET /teacher/work-times` پر می‌کند و create/update/delete را روی endpointهای رسمی `POST /teacher/work-times` و `PUT/DELETE /teacher/work-times/:id` انجام می‌دهد. روز فقط ۰ تا ۶ پذیرفته می‌شود، ساعت با قالب ۲۴ ساعته اعتبارسنجی می‌شود، پایان باید بعد از شروع باشد و overlap در همان روز پیش از mutation رد می‌شود؛ backend نیز مرجع نهایی validation باقی می‌ماند.

### Wallet & Withdrawals
- [x] موجودی و transactionها.
- [x] withdrawal history.
- [x] درخواست برداشت.
- [x] validation کارت 16 رقمی / شبا `IR` + 24 رقم.

> `TeacherWalletScreen.tsx` برای `/app/t/wallet` موجودی `/me` و ledger مشترک `/wallet/transactions` را مصرف می‌کند و به flow برداشت واقعی لینک می‌دهد. `TeacherWithdrawScreen.tsx` در `/app/t/withdraw` تاریخچه `GET /teacher/withdrawals` و ثبت `POST /teacher/withdrawals` را پیاده می‌کند؛ مبلغ مثبت و حداکثر موجودی، کارت دقیقاً ۱۶ رقم و شبا `IR` + ۲۴ رقم پیش از mutation کنترل می‌شوند و backend همچنان مرجع نهایی validation و رزرو وجه است.

### Teacher Profile & Reviews
- [x] پروفایل استاد.
- [x] ویرایش داده‌های قابل ویرایش.
- [x] reviews واقعی.
- [x] role switch به learner.

> `TeacherProfileScreen.tsx` در `/app/t/profile` اطلاعات `/me` و `/teacher/me` را ترکیب می‌کند، فقط فیلدهای مجاز `PUT /teacher/me` را ویرایش می‌کند، availability واقعی را از همان endpoint تغییر می‌دهد، به ویرایش حساب مشترک لینک می‌دهد و switch صریح به learner namespace دارد. `TeacherReviewsScreen.tsx` در `/app/t/reviews` فقط reviewهای persisted از `GET /teacher/reviews` را با loading/empty/error/retry نمایش می‌دهد و هیچ moderation یا داده ساختگی اضافه نمی‌کند.

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

- [x] deep-link داخلی اپ مستقل از `/panel` باشد.
- [x] refresh هر route روی Next mount درست resolve شود.
- [x] helper مرکزی برای ساخت app URL ایجاد شود.
- [x] هیچ component مشترکی routeهای `/panel/...` را hardcode نکند.

> قرارداد route در `frontend/src/universal-app/router.ts` متمرکز شده است: `appRoutePaths`، `appPath`، `appRouteUrl` و `navigateAppRoute` مسیرهای static/dynamic را از base path جدا می‌کنند. shellهای learner/teacher به‌جای pathهای تکراری از route name استفاده می‌کنند؛ catch-all مستقل `frontend/src/app/app/[[...path]]/page.tsx` همه deep-linkها و refreshهای `/app/...` را به همان Universal App mount می‌کند و universal source هیچ routeای به `/panel` hardcode نمی‌کند.

## فاز 7 — Capacitor Scaffold

- [x] ایجاد `frontend/native/` برای build wrapper.
- [x] Vite entry از همان universal source.
- [x] `capacitor.config.ts` با `appId = ir.vodda.vodda`.
- [x] `webDir` روی local generated bundle.
- [x] عدم استفاده از `server.url`.
- [x] native API base URL از env/config.
- [x] secure storage adapter.
- [x] آماده‌سازی hooks برای Camera/Image Picker و قابلیت‌های native آینده.
- [x] scripts لازم برای `native:dev`, `native:build`, `cap:sync`, `cap:android`, `cap:ios` در package config.

> wrapper مستقل `frontend/native/` از `src/universal-app/entry.tsx` mount می‌کند، `basePath` را برای bundle محلی خالی می‌گذارد، API مستقیم را فقط از `VITE_NATIVE_API_BASE_URL` می‌گیرد و token را با `@aparajita/capacitor-secure-storage` به native Bearer runtime می‌دهد. `vite.config.ts` از asset base نسبی استفاده می‌کند و Capacitor فقط `dist` محلی را load می‌کند. قرارداد `PlatformRuntime.capabilities` نیز device capabilityها را بدون import شدن Capacitor در Universal Source تزریق می‌کند؛ implementation فعلی `frontend/native/src/native-capabilities.ts` از `@capacitor/camera` برای Camera/Photo Picker استفاده می‌کند و الگوی توسعه capabilityهای بعدی در `docs/native-capabilities.md` مستند شده است.

## فاز 8 — آمادگی `app.vodda.ir`

- [x] base path اپ configurable باشد.
- [x] asset pathها absolute و وابسته به `/app` نباشند.
- [x] API origin configurable باشد.
- [x] web auth adapter امکان same-site/subdomain deployment را در طراحی داشته باشد.
- [x] document deployment برای دو حالت `vodda.ir/app/...` و `app.vodda.ir/...`.
- [x] هیچ business componentی hostname را hardcode نکند.

> Next host اکنون `NEXT_PUBLIC_UNIVERSAL_APP_BASE_PATH`، `NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL` و `NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL` را به Universal App/Web Platform تزریق می‌کند. Web runtime برای API و auth همچنان HttpOnly/BFF است و با `credentials: include` هم deployment هم‌origin و هم sibling same-site صریح را پوشش می‌دهد؛ Native runtime تغییری نکرده است. audit نهایی Universal Source هیچ asset محلی وابسته به `/app` و هیچ hostname بیزینسی hardcodeشده پیدا نکرد؛ asset base در wrapper بومی نیز `./` است. قرارداد و rewrite لازم برای هر دو حالت در `docs/universal-app-web-deployment.md` مستند شده‌اند.

## فاز 9 — Cleanup کدنویسی و Documentation

- [x] به‌روزرسانی `AGENTS.md` با معماری جدید.
- [x] به‌روزرسانی `README.md`.
- [ ] به‌روزرسانی `CHECKLIST.md`.
- [ ] مستند کردن mapping Flutter → Universal React.
- [ ] مستند کردن platform adapter contract.
- [ ] مستند کردن auth تفاوت web/native.
- [ ] حذف duplicate component/API codeهای ایجادشده در طول migration.
- [ ] علامت‌گذاری Flutter به‌عنوان deprecated reference بعد از تکمیل parity کدنویسی.
- [ ] حذف Flutter از workflowها فقط پس از تصمیم صریح برای حذف پوشه `app/`.

> `AGENTS.md` اکنون Universal App را source اصلی migration معرفی می‌کند و مرزهای `frontend/src/universal-app/`، Next host، Capacitor wrapper، Flutter reference، route contract و تفاوت اجباری auth وب/native را برای agentهای بعدی صریح می‌کند. `README.md` نیز ساختار جدید repository، routeهای `/app`، مرز Next/Universal/Capacitor، قرارداد متفاوت auth وب/native، اسکریپت‌های native و نقش Flutter به‌عنوان reference/fallback را منعکس می‌کند.

---

## خارج از Scope فعلی

موارد زیر عمداً مانع تکمیل roadmap کدنویسی نیستند:

- `npm install` در محیطی که registry در دسترس نیست.
- `next build`، `vite build` و build Android/iOS.
- `flutter test` یا مقایسه runtime Flutter.