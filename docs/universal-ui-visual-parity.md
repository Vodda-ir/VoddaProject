# Universal App Visual Parity

آخرین بازبینی: 2026-09-21

## هدف

این pass بعد از تکمیل feature parity انجام شد تا Universal React App فقط از نظر قابلیت معادل Flutter نباشد و زبان بصری محصول نیز به کیفیت نسخه Flutter برسد. Flutter همچنان deprecated reference است و source اصلی توسعه باقی نمی‌ماند.

## Design system مشترک

زبان بصری مرجع از theme و screenهای Flutter استخراج و در `frontend/src/universal-app/ui/` متمرکز شد:

- palette گرم sand/olive با accentهای gold/clay؛
- typography با اولویت `IRANYekanXFaNum` و hierarchy کامل caption/body/title/heading/display؛
- radiusهای 18 تا 30 پیکسل و card hierarchy نزدیک Material 3؛
- shadow و gradientهای مشترک برای hero، wallet و surfaceهای برجسته؛
- Button/Input/Card/Avatar/State/Dialog/Sheet بازطراحی‌شده؛
- patternهای مشترک `SectionHeader`, `IconBadge`, `StatusPill`, `MetricTile`, `WalletHero`, `ActionTile`, `HeroPanel`؛
- motion سبک، hover/tap feedback، focus state، reduced-motion و horizontal rail بدون scrollbar؛
- shellهای learner/teacher با navigation شناور، active indicator، safe-area و frame responsive.

## Learner surfaces

- Login / OTP / launch / restore error؛
- profile completion و profile edit؛
- Home شامل greeting، hero search، quick categories، teacher rails و featured teacher؛
- Search و teacher result cards؛
- Teacher Profile شامل hero، verified state، metrics، services، reviews و sticky booking CTA؛
- Booking به‌صورت visual step flow برای service/date-slot/review؛
- Sessions با segmented state، status pill، official-time treatment و review/cancel flows؛
- Wallet و transaction cards؛
- Profile و teacher-mode entry.

## Teacher surfaces

- Dashboard شامل account/wallet hero، pending request banner، next session و quick management؛
- Requests & Sessions؛
- Services؛
- Work Times؛
- Wallet؛
- Withdrawals؛
- Teacher Profile و professional form؛
- Reviews.

## قراردادهای حفظ‌شده

- Universal Source همچنان از `next/*` مستقل است.
- Web auth همچنان HttpOnly cookie + BFF است.
- Native auth همچنان secure token + Bearer مستقیم به Go API است.
- `/panel` و صفحات public تغییر معماری نداده‌اند.
- زمان جلسه همچنان از `local_*` authoritative backend نمایش داده می‌شود.
- moderation خدمت، booking conflict، wallet/withdrawal و role policy تغییری نکرده‌اند.
- Flutter حذف نشده و فقط deprecated reference باقی مانده است.

## Validation

در پایان pass، همه Screenهای اصلی Universal به‌صورت استاتیک برای ساختار جدید، توازن براکت‌ها و عدم import از `next/*` audit شدند. build، test، npm install، Capacitor sync و Android/iOS build در این pass اجرا نشده‌اند؛ validation runtime/staging همچنان مرحله جداگانه است.
