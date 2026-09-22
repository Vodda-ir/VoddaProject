<div dir="rtl">

# چک‌لیست وضعیت وُدّا

آخرین بازبینی: **۲۰۲۶-۰۹-۲۱**

این فایل فقط وضعیت واقعی کد فعلی را نشان می‌دهد. قابلیت وابسته به سرویس بیرونی تا زمان اتصال و آزمون end-to-end «تکمیل‌شده» محسوب نمی‌شود.

## هستهٔ محصول

- [x] ورود OTP، JWT و کنترل نقش/فعال‌بودن حساب از دیتابیس
- [x] ذخیرهٔ digest کد OTP و جلوگیری از bypass در production
- [x] پروفایل کاربر و استاد و onboarding اتمیک استاد
- [x] بررسی و تأیید/رد استاد و خدمت توسط مدیر
- [x] تعریف و ویرایش برنامهٔ کاری با کنترل ساعت و هم‌پوشانی
- [x] جستجوی استاد تأییدشده با نام، حوزه، شهر، جنسیت و pagination
- [x] availability رزرو authoritative در Backend بر اساس timezone، مدت خدمت، برنامهٔ کاری و تداخل
- [x] مصرف یکسان availability در وب و Flutter و refresh پس از conflict
- [x] ذخیرهٔ UTC و بازگرداندن `local_date/local_start/local_end` رسمی برای همهٔ فهرست‌های جلسه
- [x] رزرو، پذیرش، رد، لغو پیش از شروع، تکمیل و امتیازدهی
- [x] refund و settlement اتمیک و جلوگیری از عملیات تکراری
- [x] endpoint واقعی نظرهای استاد و نمایش آن در پنل

## مالی

- [x] کیف پول و دفتر تراکنش
- [x] debit شرطی، row locking و جلوگیری از موجودی منفی
- [x] رزرو، refund، settlement و برداشت در transactionهای MySQL
- [x] کنترل مبلغ برداشت نسبت به موجودی
- [x] الزام شماره کارت ۱۶ رقمی یا شبا `IR` + ۲۴ رقم در وب و Flutter
- [x] تاریخچه و وضعیت برداشت برای استاد و مدیر
- [x] هشدار صریح که ثبت `paid` جایگزین انتقال بانکی نیست
- [x] حذف شارژ development از UI production
- [ ] زرین‌پال واقعی: request، redirect، callback، verify، idempotency و reconciliation

- [x] required production seed مستقل از `AUTO_SEED`: دو ادمین الزامی و ۴۵ مدرس تأییدشده/حذف‌نشده از دیتابیس legacy به‌صورت idempotent در [`docs/required-production-seed.md`](docs/required-production-seed.md) مستند و seed می‌شوند.

## وب و UI/UX

- [x] نشست HttpOnly و عبور همهٔ پنل‌ها از BFF
- [x] rewrite مسیرهای legacy `/api/v1` به BFF
- [x] ناوبری موبایل، focus-visible و reduced-motion
- [x] جستجوی debounce‌شده با AbortController، URL state و pagination
- [x] تفکیک loading، empty، error و retry در مسیرهای اصلی
- [x] حذف آمار، نمودار، تماس، شارژ و CTAهای ساختگی
- [x] پنل قرآن‌آموز با زمان رسمی، لغو واقعی و وضعیت مالی
- [x] پنل استاد کامل: داشبورد واقعی، درخواست‌ها، جلسات، خدمات، برنامهٔ کاری، کیف پول، برداشت و نظرها
- [x] جلوگیری از فعال‌سازی خدمت توسط استاد؛ فعال‌سازی فقط در moderation مدیر
- [x] پنل مدیر: کاربران، استادان، خدمات، جلسات، برداشت، پشتیبانی و audit
- [x] redesign عملیاتی پنل مدیر و استاد: shell و navigation گروه‌بندی‌شده، guardهای دسترسی، مدیریت همهٔ استادان با فیلتر/status/search/pagination واقعی، و workflowهای حرفه‌ای جلسات/خدمات/مالی در [`docs/admin-teacher-panel-redesign.md`](docs/admin-teacher-panel-redesign.md)
- [x] جدول‌ها و کارت‌های responsive و عملیات حساس دارای confirmation/busy state
- [x] FAQ، قوانین و حریم خصوصی هماهنگ با قابلیت‌های فعال
- [x] redesign کامل Public Website بر اساس زبان بصری Universal App: Landing، header/mobile menu، Search، Teacher Profile، About/FAQ/Contact/Privacy/Terms/Blog و stateهای عمومی در [`docs/public-web-redesign.md`](docs/public-web-redesign.md) مستند و بازطراحی شدند.
- [x] visual parity کامل Universal App با Flutter: design system، shell/navigation، auth/onboarding، تمام screenهای learner و teacher، stateها، heroها، statusها و interaction hierarchy بازطراحی شدند.

## مهاجرت Universal App + Capacitor

- [x] رودمپ اجرایی مهاجرت در [`docs/universal-app-migration-roadmap.md`](docs/universal-app-migration-roadmap.md) ایجاد شد.
- [x] ساختار `frontend/src/universal-app/`، entry مستقل React، routing داخلی و mount مستقل `/app/...` ایجاد شد؛ importهای `next/*` در این لایه با ESLint ممنوع شده‌اند و base path قابل تنظیم است.
- [x] platform adapter مستقل برای web/native، شامل runtime contract، API request مشترک، session restore و login/logout ایجاد شد.
- [x] حفظ HttpOnly/BFF روی وب و secure token/Bearer روی native؛ Native wrapper token را با `@aparajita/capacitor-secure-storage` ذخیره می‌کند و فقط native adapter آن را به Bearer header تبدیل می‌کند.
- [x] design tokens مشترک، Icon قابل استفاده در Universal App و primitiveهای framework-independent شامل Button/Input/Card/Avatar/State/Sheet/Dialog ایجاد شدند.
- [x] shared mobile-first learner/teacher app shells و bottom navigation مستقل از `/panel` با RTL، safe-area و active route state ایجاد شدند.
- [x] launch/session bootstrap، OTP request/verify و redirect اولیه بر اساس session/role در Universal App پیاده شد.
- [x] onboarding مسیر `need_profile` در `/app/profile/edit` با restore session و `PUT /me` برای نام، شهر و bio پیاده شد و همان route برای حساب موجود ویرایش نام/شهر/bio و آواتار multipart را انجام می‌دهد.
- [x] route guard namespace استاد در Universal App؛ `/app/t/...` برای `role=teacher|admin` قابل دسترسی است و learner namespace برای همه حساب‌های authenticated باز می‌ماند.
- [x] role switch بین learner و teacher mode برای حساب teacher/admin بدون mutation نقش سرور؛ switch فقط namespace/shell فعال را بین `/app/...` و `/app/t/...` تغییر می‌دهد.
- [x] Home قرآن‌آموز در Universal App با header/session واقعی، hero و دسته‌های سریع، API واقعی `/teachers`، اساتید پیشنهادی، استادان بانو و featured teacher بدون داده ساختگی parity شده است.
- [x] Search قرآن‌آموز در Universal App با جستجوی server-side روی `/teachers`، debounce، فیلترهای واقعی `q/field/city/female`، URL state و حالت‌های loading/empty/error/retry پیاده شده است.
- [x] Teacher Profile قرآن‌آموز در `/app/teacher/:id` با اطلاعات واقعی استاد، serviceهای فعال/تأییدشده، review و rating واقعی و CTA رزرو متصل به `/app/book/:id` پیاده شده است.
- [x] Booking قرآن‌آموز در `/app/book/:id` با انتخاب خدمت واقعی، availability authoritative بک‌اند، نمایش `local_*`، ارسال `scheduled_at` از `start_at` UTC و refresh خودکار availability پس از conflict پیاده شده است.
- [x] Sessions قرآن‌آموز در `/app/sessions` با upcoming/past واقعی، نمایش `local_date/local_start/local_end` رسمی backend، لغو پیش از شروع و rating/review پس از completion پیاده شده است.
- [x] Wallet قرآن‌آموز در `/app/wallet` با موجودی واقعی از `/me`، تاریخچه `/wallet/transactions` و بدون CTA شارژ تا اتصال درگاه واقعی پیاده شده است.
- [x] Profile قرآن‌آموز در `/app/profile` با اطلاعات session، لینک wallet، logout، ویرایش نام/شهر/bio، upload آواتار و role switch برای teacher/admin parity شده است.
- [x] parity کامل learner app با Flutter.
- [x] Dashboard استاد در `/app/t` با اطلاعات واقعی `/me`، موجودی/امتیاز/تعداد نظر و جلسه، pending requests و جلسه بعدی از `/teacher/sessions` و زمان رسمی `local_*` پیاده شد؛ availability واقعی از `PUT /teacher/me` پشتیبانی می‌شود و کنترل آن در پروفایل استاد قرار دارد.
- [x] Requests & Sessions استاد در `/app/t/requests` و `/app/t/sessions` با pending/upcoming/past واقعی، accept، reject با reason اجباری، complete با confirmation، refresh پس از mutation و نمایش صرفاً `local_*` رسمی backend پیاده شد.
- [x] Services استاد در `/app/t/services` با list واقعی از `/teacher/me`، create/edit/delete روی `/teacher/services`، deactivate فقط با `active:false`، validation مدت ۱۰ تا ۲۴۰ دقیقه و حفظ moderation بدون self-approve پیاده شد.
- [x] Work Times استاد در `/app/t/work-times` با list واقعی `/teacher/work-times`، create/update/delete روی endpointهای رسمی، validation روز ۰ تا ۶، ساعت ۲۴ ساعته، پایان بعد از شروع و جلوگیری از overlap همان روز پیاده شد.
- [x] Wallet & Withdrawals استاد در `/app/t/wallet` و `/app/t/withdraw` با موجودی و transaction واقعی، تاریخچه برداشت، ثبت درخواست و validation کارت ۱۶ رقمی/شبا `IR` + ۲۴ رقم پیاده شد.
- [x] Teacher Profile & Reviews استاد در `/app/t/profile` و `/app/t/reviews` با اطلاعات واقعی `/me` و `/teacher/me`، ویرایش فقط فیلدهای مجاز، availability واقعی، reviewهای persisted و role switch به learner پیاده شد.
- [x] parity کامل teacher app با Flutter.
- [x] helper مرکزی route در Universal App با `appRoutePaths`/`appPath`/`appRouteUrl`/`navigateAppRoute` ایجاد شد و shellها از route name به‌جای path تکراری استفاده می‌کنند.
- [x] route contract مستقل از `/panel/...`؛ deep-link/refreshهای `/app/...` از catch-all مستقل Next به Universal App resolve می‌شوند و universal source routeهای `/panel` را hardcode نمی‌کند.
- [x] Capacitor/Vite scaffold با `ir.vodda.vodda`، local `dist` bundle، بدون `server.url`، API base URL محیطی و secure token storage ایجاد شد.
- [x] native capability hook مستقل از Universal Source با `PlatformRuntime.capabilities` ایجاد شد؛ wrapper بومی Camera/Photo Picker را با `@capacitor/camera` تزریق می‌کند و الگوی توسعه capabilityهای بعدی در `docs/native-capabilities.md` مستند است.
- [x] deployment config وب برای base path و BFF/auth origin محیطی شد؛ Web adapter با HttpOnly/BFF و `credentials: include` برای same-origin یا same-site subdomain آماده است و قرارداد دو حالت `/app` و `app.vodda.ir` در `docs/universal-app-web-deployment.md` مستند شد.
- [x] audit نهایی asset path/hostname: Universal Source هیچ asset محلی وابسته به `/app` و هیچ hostname بیزینسی hardcode نمی‌کند و native Vite از asset base نسبی `./` استفاده می‌کند؛ فاز ۸ آماده انتقال config/deployment است.
- [x] `AGENTS.md` و `README.md` با معماری Universal App، مرزهای Next/Capacitor، route contract و مدل auth متفاوت web/native همگام شده‌اند و وضعیت فازهای ۰ تا ۸ در این checklist ثبت شده است.
- [x] mapping دقیق Flutter → Universal React در [`docs/flutter-universal-mapping.md`](docs/flutter-universal-mapping.md) ثبت شده و route/componentهای learner/teacher، flowهای ادغام‌شده و تفاوت‌های عمدی migration را مشخص می‌کند.
- [x] platform adapter contract در [`docs/platform-adapter-contract.md`](docs/platform-adapter-contract.md) مستند شد؛ مرز `PlatformRuntime`، request/session lifecycle، error contract، secure storage و capability injection را مشخص می‌کند.
- [x] تفاوت auth web/native در [`docs/auth-web-native.md`](docs/auth-web-native.md) مستند شد؛ وب فقط HttpOnly cookie + BFF و native فقط secure token + Bearer روی Go API مستقیم باقی می‌ماند.
- [x] اولین بسته duplicate API cleanup: envelope مشترک پاسخ `data` در `frontend/src/universal-app/platform/api.ts` متمرکز شد و featureهای booking/sessions/teachers/wallet از تعریف‌های تکراری محلی خارج شدند.
- [x] بسته duplicate component cleanup کیف پول: کارت تراکنش و تبدیل ارقام مشترک learner/teacher در `features/wallet/WalletTransactionCard.tsx` متمرکز شد و هر دو screen همان component را مصرف می‌کنند.
- [x] audit نهایی duplicate component/API codeهای migration تکمیل شد؛ coercionهای API در `platform/api.ts`، error mapping در `ui/errorMessage.ts` و formatter/componentهای مشترک wallet متمرکزند و duplicate معنی‌داری که abstraction جدیدی را توجیه کند باقی نمانده است.
- [x] Flutter در `app/` پس از تکمیل parity و cleanup به‌عنوان **deprecated reference** علامت‌گذاری شد؛ Universal App source canonical است و توسعهٔ عادی feature/bugfix نباید در Flutter ادامه پیدا کند.
- [x] pass نهایی UI/UX و visual parity در [`docs/universal-ui-visual-parity.md`](docs/universal-ui-visual-parity.md) ثبت شد؛ زبان بصری Flutter به design system مشترک Universal منتقل و همهٔ ۱۶ Screen اصلی audit شدند.
- [ ] حذف Flutter از workflowها فقط پس از تصمیم صریح برای حذف پوشه `app/`؛ طبق تصمیم ۲۰۲۶-۰۹-۰۹ پوشه و workflowهای Flutter فعلاً حفظ می‌شوند.

> در scope فعلی، build/test/npm install/Android/iOS generation شرط تکمیل این رودمپ نیست و اجرا نمی‌شود. دو آیتم اجرایی cleanup/deprecation migration بسته شده‌اند؛ checkbox حذف Flutter عمداً deferred است و مانع تکمیل کدنویسی migration نیست.

## Flutter — Deprecated Reference

> Flutter دیگر source اصلی توسعهٔ محصول نیست. پوشه `app/` برای مراجعهٔ legacy و تاریخچهٔ migration حفظ می‌شود و حذف یا تغییر عادی آن بدون درخواست صریح انجام نمی‌شود.

- [x] Riverpod، go_router، Dio و secure storage
- [x] guard نقش استاد و learner
- [x] جستجوی server-side با debounce و فیلتر واقعی
- [x] رزرو از availability رسمی Backend
- [x] نمایش زمان جلسه از فیلدهای رسمی Backend، نه timezone دستگاه
- [x] تأیید/رد/لغو/تکمیل/امتیازدهی واقعی با busy و error state
- [x] حذف اعلان، تماس، امتیاز و درآمد ساختگی
- [x] داشبورد استاد با موجودی، امتیاز، نظر و تعداد جلسهٔ واقعی
- [x] خدمات استاد با مدت ۱۰ تا ۲۴۰ دقیقه و policy moderation
- [x] برداشت با مبلغ، کارت/شبا و پیام چرخهٔ واقعی
- [x] Android release بدون keystore production عمداً fail می‌شود
- [x] backup/transfer داده‌های حساس Android غیرفعال است
- [ ] archive/signing و Keychain روی iOS واقعی
- [ ] انتشار نسخهٔ امضاشده در فروشگاه‌ها

## امنیت و عملیات

- [x] rate limit برای OTP، جستجو، mutation، مالی و admin
- [x] request ID، access log، security headers و HSTS
- [x] body limit و اعتبارسنجی آپلود آواتار
- [x] liveness/readiness دیتابیس
- [x] audit log عملیات موفق مدیر
- [x] backup فشرده با checksum و restore محافظت‌شده
- [x] runtime غیر root، `no-new-privileges` و publish پورت production روی localhost
- [ ] migration نسخه‌دار و rollback آزموده‌شده
- [ ] ممیزی و اعمال foreign keyها
- [ ] Redis/shared limiter و object storage برای چند replica
- [ ] metrics، tracing و alerting مرکزی

## کیفیت و اعتبارسنجی

- [x] تست‌های Go برای availability، timezone نمایش و policy لغو
- [x] تست‌های Flutter برای parsing availability و زمان رسمی جلسه
- [x] تست‌های Node برای BFF، صداقت محتوا، پنل استاد، moderation، برداشت و timezone
- [x] workflow شامل Go format/vet/race/build، MySQL integration، Node test/lint/build، Flutter analyze/test و Docker validation است
- [ ] اجرای موفق workflow روی commit نهایی؛ GitHub Actions فعلاً jobها را پیش از checkout با `steps: null` متوقف می‌کند
- [ ] smoke test کامل staging برای نقش‌ها، رزرو، refund، settlement، برداشت و restore
- [ ] E2E مرورگر و اپ روی Backend واقعی staging
- [ ] accessibility audit خودکار و screen reader

## قابلیت‌های بیرونی باقی‌مانده

- [ ] درگاه واقعی زرین‌پال
- [ ] provider واقعی تماس صوتی و lifecycle اتصال
- [ ] انتشار رسمی اپ

جزئیات: [`docs/audit-2026-07-27.md`](docs/audit-2026-07-27.md)

</div>