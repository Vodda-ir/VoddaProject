# Flutter → Universal React Mapping

آخرین بازبینی: 2026-08-30

این سند mapping مرجع migration اپ Flutter قدیمی در `app/` به Universal React Source در `frontend/src/universal-app/` است. هدف آن جلوگیری از بازنویسی دوباره flowهای parity‌شده و مشخص‌کردن محل canonical هر قابلیت پس از مهاجرت است.

## قواعد استفاده از این mapping

- `frontend/src/universal-app/` منبع اصلی اپ جدید است؛ Flutter فقط تا پایان cleanup نقش reference/fallback دارد.
- routeهای اپ وب زیر base path فعلی `/app` نمایش داده می‌شوند، اما Universal Source خود base path را hardcode نمی‌کند.
- `/panel/...` بخشی از این migration نیست و routeهای آن نباید جایگزین routeهای اپ شوند.
- تفاوت transport/auth وب و native در platform adapter نگه داشته می‌شود؛ componentهای feature نباید منطق Flutter `Dio` یا token storage را کپی کنند.
- API و زمان جلسه همچنان از قرارداد authoritative بک‌اند استفاده می‌کنند؛ نمایش زمان بر مبنای `local_date/local_start/local_end` است.

## Routing و Shell

| Flutter | Universal React | Route فعلی وب | وضعیت/نکته |
| --- | --- | --- | --- |
| `app/lib/core/router/app_router.dart` | `frontend/src/universal-app/router.ts` + `UniversalApp.tsx` | `/app/...` | route contract مرکزی؛ مستقل از Next App Router |
| `features/shell/app_shell.dart` | learner shell در `frontend/src/universal-app/ui/` | learner namespace | bottom navigation و shell مشترک learner |
| `features/teacher/presentation/teacher_shell.dart` | teacher shell در `frontend/src/universal-app/ui/` | `/app/t/...` | namespace مستقل teacher |
| Flutter `/launch` | bootstrap داخل `AuthExperience.tsx` / `UniversalApp.tsx` | `/app` یا route درخواستی | splash/session restore دیگر route عمومی جداگانه نیست |
| Flutter guard در `GoRouter.redirect` | guard در `UniversalApp.tsx` + session runtime | همه routeهای protected | teacher namespace فقط برای `teacher|admin` |

## Auth و Account

| Flutter | Universal React | Route | parity |
| --- | --- | --- | --- |
| `features/auth/presentation/login_screen.dart` | `features/auth/AuthExperience.tsx` | `/app/login` | OTP request/verify، session bootstrap و redirect |
| `features/account/presentation/edit_profile_screen.dart` | `features/auth/ProfileCompletionScreen.tsx` | `/app/profile/edit` | onboarding `need_profile`، ویرایش نام/شهر/bio و avatar |
| `features/account/presentation/profile_tab.dart` | `features/profile/LearnerProfileScreen.tsx` | `/app/profile` | اطلاعات حساب، wallet link، logout و role switch |
| `features/teacher/presentation/role_sheet.dart` | `features/auth/RoleModeSwitch.tsx` | learner ↔ teacher namespace | switch فقط mode/namespace را تغییر می‌دهد؛ role سرور mutate نمی‌شود |
| Flutter `DioClient`/secure storage | `platform/` runtime contract | بدون route | جایگزینی platform-specific؛ جزئیات قرارداد در سند platform adapter نگهداری می‌شود |

## Learner App

| Flutter screen/flow | Universal React | Route | نکته parity |
| --- | --- | --- | --- |
| `features/teachers/presentation/home_screen.dart` | `features/home/LearnerHomeScreen.tsx` | `/app` | header/session، جستجو، دسته‌ها، suggested/female/featured teachers |
| `features/teachers/presentation/search_screen.dart` | `features/search/LearnerSearchScreen.tsx` | `/app/search` | جستجوی server-side، debounce و فیلترهای واقعی |
| `features/teachers/presentation/teacher_profile_screen.dart` | `features/teachers/LearnerTeacherProfileScreen.tsx` | `/app/teacher/:id` | اطلاعات استاد، serviceهای فعال، rating/reviews و booking CTA |
| `features/sessions/presentation/booking_screen.dart` | `features/booking/LearnerBookingScreen.tsx` | `/app/book/:id` | service، availability authoritative، `local_*` و refresh conflict |
| `features/sessions/presentation/sessions_screen.dart` | `features/sessions/LearnerSessionsScreen.tsx` | `/app/sessions` | upcoming/past، لغو و زمان رسمی backend |
| `features/sessions/presentation/rating_sheet.dart` | rating/review flow داخل `LearnerSessionsScreen.tsx` | `/app/sessions` | بعد از completion؛ دیگر screen مستقل نیست |
| `features/wallet/presentation/wallet_screen.dart` | `features/wallet/LearnerWalletScreen.tsx` | `/app/wallet` | موجودی و transaction واقعی؛ بدون CTA شارژ ساختگی |
| `features/account/presentation/profile_tab.dart` | `features/profile/LearnerProfileScreen.tsx` | `/app/profile` | پروفایل اصلی learner |

## Teacher App

| Flutter screen/flow | Universal React | Route | نکته parity |
| --- | --- | --- | --- |
| `features/teacher/presentation/teacher_dashboard.dart` | `features/teacher/TeacherDashboardScreen.tsx` | `/app/t` | summary واقعی استاد، جلسات، موجودی، rating/review count |
| `features/teacher/presentation/requests_screen.dart` | `features/teacher/TeacherSessionsScreen.tsx` | `/app/t/requests` | pending requests، accept و reject با reason |
| `features/teacher/presentation/teacher_sessions.dart` | `features/teacher/TeacherSessionsScreen.tsx` | `/app/t/sessions` | upcoming/past و complete session؛ همان component با mode متفاوت |
| `features/teacher/presentation/services_screen.dart` | `features/teacher/TeacherServicesScreen.tsx` | `/app/t/services` | create/edit/deactivate/delete با moderation؛ self-approve ممنوع |
| `features/teacher/presentation/work_times_screen.dart` | `features/teacher/TeacherWorkTimesScreen.tsx` | `/app/t/work-times` | Flutter route قدیمی `/t/worktimes` به contract جدید `/t/work-times` نرمال شده است |
| `features/teacher/presentation/teacher_wallet.dart` | `features/teacher/TeacherWalletScreen.tsx` | `/app/t/wallet` | balance و ledger واقعی |
| `features/teacher/presentation/withdraw_screen.dart` | `features/teacher/TeacherWithdrawScreen.tsx` | `/app/t/withdraw` | history/request و validation کارت/شبا |
| `features/teacher/presentation/teacher_profile.dart` | `features/teacher/TeacherProfileScreen.tsx` | `/app/t/profile` | فیلدهای مجاز، availability و switch به learner |
| reviewهای موجود در داده/پروفایل Flutter | `features/teacher/TeacherReviewsScreen.tsx` | `/app/t/reviews` | Universal App reviewهای persisted را به route مستقل و صریح منتقل کرده است |

## Data/API Mapping

در Flutter، repositoryهای feature و `core/network/dio_client.dart` مستقیماً API را مصرف می‌کردند. در Universal App این مسئولیت دو لایه شده است:

1. feature-local `api.ts`/typeها برای contract بیزینسی هر feature، مانند `features/teachers/api.ts`، `features/booking/api.ts`، `features/sessions/api.ts` و `features/wallet/api.ts`؛
2. `frontend/src/universal-app/platform/` برای transport/session وابسته به محیط.

بنابراین هنگام cleanup نباید Flutter repositoryها به React منتقل یا دوباره کپی شوند. endpoint بیزینسی باید از feature API فعلی عبور کند و transport باید از `PlatformRuntime` بیاید.

## تفاوت‌های عمدی نسبت به Flutter

- `/launch` به route مستقل Universal تبدیل نشده؛ bootstrap قبل از نمایش route مقصد انجام می‌شود.
- `/t/worktimes` قدیمی Flutter در Universal به `/t/work-times` استاندارد شده است.
- درخواست‌ها و جلسات استاد در React یک implementation مشترک (`TeacherSessionsScreen.tsx`) با route/mode متفاوت دارند تا duplicate logic ایجاد نشود.
- rating sheet learner داخل flow جلسات ادغام شده و component مستقل parity الزام نیست.
- `/app/t/reviews` در Universal route مستقل دارد؛ این تفکیک، داده جدید یا policy جدید ایجاد نمی‌کند و فقط reviewهای persisted backend را نمایش می‌دهد.
- هیچ mappingی به `/panel/...` وجود ندارد؛ پنل وب legacy/current یک surface جداگانه است.

## معیار مراجعه بعدی

اگر در ادامه migration قابلیتی در Flutter پیدا شد که در این جدول نیست، قبل از ایجاد component جدید باید ابتدا بررسی شود که همان flow در یکی از screenهای Universal موجود ادغام نشده باشد. فقط فقدان رفتار بیزینسی واقعی، نه تفاوت نام فایل یا layout، به‌عنوان gap parity محسوب می‌شود.
