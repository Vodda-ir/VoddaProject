# Universal App Visual Parity

آخرین بازبینی: 2026-09-21

## هدف

این pass بعد از تکمیل feature parity انجام شد تا Universal React App فقط از نظر قابلیت معادل Flutter نباشد و ساختار بصری، نسبت‌ها، hierarchy و stateهای اصلی نیز تا حد ممکن از implementation مرجع Flutter پیروی کنند. Flutter همچنان deprecated reference است و source اصلی توسعه باقی نمی‌ماند.

## Design system مشترک

زبان بصری مرجع از theme و screenهای Flutter استخراج و در `frontend/src/universal-app/ui/` متمرکز شده است:

- palette اصلی sand/olive و accentهای gold/clay دقیقاً با `AppColors` Flutter هم‌راستاست؛
- font اصلی `IRANYekanXFaNum` و hierarchy متن با اندازه/وزن‌های نزدیک screenهای Flutter استفاده می‌شود؛
- Button پایه 52px و 15px/700، Input با radius 18 و Card پیش‌فرض flat با radius 24 مطابق Material theme مرجع تنظیم شده‌اند؛
- focus ورودی‌ها فقط border olive دارد و scale/lift/glow و shadowهای وبی اضافه که در Flutter وجود ندارند حذف شده‌اند؛
- `HeroPanel` با gradient `olive700 → olive600 → olive500` و `WalletHero` با gradient `olive800 → olive600` و radius/padding/shadow مرجع هم‌راستا شده‌اند؛
- patternهای مشترک `SectionHeader`, `IconBadge`, `StatusPill`, `MetricTile`, `WalletHero`, `ActionTile`, `HeroPanel` حفظ شده‌اند؛
- app frame حداکثر 600px است و bottom navigation ثابت، تمام‌عرض frame و 68px است؛ navigation شناور/card-like استفاده نمی‌شود؛
- animation فقط برای spinner/overlay/dialog/sheet حفظ شده و animationهای ورود section و hover/tap transformهای اضافه حذف شده‌اند؛
- safe-area، RTL و base-path navigation همچنان در shell مشترک learner/teacher رعایت می‌شوند.

## Learner surfaces

- Launch و Login با لوگوی واقعی وُدّا، فرم ساده Flutter-style و OTP پنج‌خانه‌ای؛
- Profile completion / edit با AppBar، avatar 88px + camera badge، فیلدهای 16px-radius و شماره موبایل read-only؛
- Home با greeting header، role switch sheet برای teacher/admin، hero با CTA سفید «جستجوی استاد»، quick categories، teacher rails و featured teacher؛
- `TeacherCard` مشترک Home/Search با عرض 232px در rail و حالت wide در Search، شامل avatar، verified state، rating/city/session، قیمت شروع و CTA رزرو؛
- Search با search box + دکمه filter 50px، field chips، city/gender در Bottom Sheet و active filter chips؛
- Teacher Profile عمومی با avatar مرکزی، verified badge، سه stat سفید، about ساده، خدمات تأییدشده، reviews و CTA ساده رزرو؛
- Booking با teacher summary ساده و سه section card شماره‌دار 28px برای service/date-slot/review؛
- Sessions با tabهای 14px-radius، cardهای 24px، نوار زمان sand50، cancel outlined و rating sheet؛
- Wallet با hero مرجع، notice طلایی، transaction card مشترک 14px/18px و آیکون جهت تراکنش؛
- Profile با card هویت، role tile، menu card یکپارچه، logout و version footer.

## Teacher surfaces

- Dashboard با role switch sheet مرجع، wallet summary، metricهای سه‌ستونه با divider، pending banner، next-session card و quick-management tileهای ساده؛
- Requests با card مستقل دارای badge «جدید»، زمان/قیمت و actionهای رد/تأیید؛
- Sessions با status + `مدت · مبلغ`، نوار زمان sand50 و فعال‌شدن ثبت برگزاری فقط پس از پایان واقعی جلسه؛
- Services با status chip مرجع، action row شامل edit/deactivate/delete، Dialog editor و CTA پایین؛
- Work Times با day cardهای 18px، «افزودن بازه» pill، range chipهای قابل edit/delete و Dialog editor؛
- Wallet با hero مرجع، CTA برداشت، سه stat «درآمد کل / تراکنش‌ها / کارمزد وُدّا» و transaction card مشترک؛
- Withdrawals با balance box ساده، quick amountها، form مقصد و success state تمام‌صفحه؛
- Teacher Profile با card هویت، verified badge، availability switch، menu card و professional form داخل sheet؛
- Reviews با route header واحد و بدون heading تکراری.

## قراردادهای حفظ‌شده

- Universal Source همچنان از `next/*` مستقل است.
- Web auth همچنان HttpOnly cookie + BFF است.
- Native auth همچنان secure token + Bearer مستقیم به Go API است.
- Capacitor همچنان از bundle محلی `dist` استفاده می‌کند و `server.url` ندارد.
- `/panel` و صفحات public تغییر معماری نداده‌اند.
- زمان جلسه همچنان از `local_*` authoritative backend نمایش داده می‌شود.
- moderation خدمت، booking conflict، wallet/withdrawal و role policy تغییر نکرده‌اند.
- Flutter حذف نشده و فقط deprecated reference باقی مانده است.

## Validation

در پایان این refinement، فایل‌های اصلی learner/teacher، primitive/patternهای UI و shellها به‌صورت استاتیک برای توازن JSX/براکت‌ها و importهای بلااستفاده audit شدند. جستجوی repository برای `RoleModeSwitch` نتیجه‌ای ندارد و داخل `frontend/src/universal-app/` import از `next/*` باقی نمانده است. shell روی frame حداکثر 600px و bottom navigation 68px تثبیت شده و Capacitor config فقط `webDir: "dist"` دارد.

طبق محدودیت این migration، build، test، `npm install`، Capacitor sync و Android/iOS build در این pass اجرا نشده‌اند؛ validation runtime/staging مرحله جداگانه است.
