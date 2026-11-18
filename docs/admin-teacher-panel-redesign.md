# Admin & Teacher Operational Panel Redesign

آخرین بازبینی: 2026-09-22

## هدف

پنل‌های Next.js مدیر و استاد از مجموعه‌ای از صفحه‌های مستقل و ساده به یک زبان بصری و عملیاتی مشترک منتقل شدند. این pass صرفاً cosmetic نیست؛ hierarchy، navigation، filtering، pagination، access guard و چند قرارداد API نیز اصلاح شده‌اند.

## پنل مدیر

### Shell و دسترسی

- sidebar گروه‌بندی‌شده: نمای کلی، مدیریت، عملیات و سیستم.
- context bar برای صفحهٔ فعال و switch امن بین پنل‌های مجاز.
- دسترسی `/panel/admin/*` قبل از mount شدن child pageها با `/me` بررسی می‌شود و فقط role فعلی `admin` مجاز است.
- دسترسی پنل استاد برای admin فقط وقتی نمایش داده می‌شود که همان User واقعاً Teacher profile داشته باشد.

### Dashboard

- KPIهای واقعی کاربران، استادان، جلسات و کارمزد.
- صف استادان در انتظار بررسی با approve/reject واقعی.
- quick action برای مسیرهای پرتکرار.
- خلاصه مالی فقط بر پایه ledger فعلی؛ هیچ نمودار یا metric ساختگی نمایش داده نمی‌شود.

### مدیریت استادان

`/panel/admin/teachers` اکنون یک directory واقعی است:

- پیش‌فرض: همه استادان.
- فیلتر وضعیت: همه، pending، approved، rejected.
- شمارندهٔ مستقل هر وضعیت.
- جستجوی server-side با `q`.
- فیلتر server-side شهر و حوزه فعالیت.
- پشتیبانی backend از فیلتر جنسیت نیز در قرارداد endpoint اضافه شده است.
- pagination واقعی.
- نمایش account inactive مستقل از moderation status.
- approve/reject فقط برای pending.
- لینک پروفایل عمومی برای approved.

Admin و Public visibility از هم جدا شده‌اند. در Admin، `status=approved` همه profileهای approved را برمی‌گرداند حتی اگر `available=false` یا User غیرفعال باشد. محدودیت `verified + available + active` فقط با `TeacherFilter.PublicOnly=true` و در Search عمومی اعمال می‌شود.

### صفحات عملیاتی دیگر

- Users: فیلتر role، pagination و activate/deactivate.
- Sessions: فیلتر status و pagination.
- Services: moderation queue حرفه‌ای.
- Withdrawals: فیلتر status، pagination و عملیات پرداخت/رد.
- Support: inbox جدید/رسیدگی‌شده با pagination.
- Audit: pagination و نمایش واضح action/target/actor/request id.

در Withdrawals یک mismatch واقعی هم اصلاح شد: frontend قبلاً `{action: "paid"|"rejected"}` می‌فرستاد، در حالی که backend قرارداد `{paid: boolean}` دارد. UI جدید payload صحیح را ارسال می‌کند.

## پنل استاد

### Shell

Navigation به سه حوزه تقسیم شد: امروز، ارائه خدمات و مالی.

Teacher profile capability guard قبلی حفظ شده است؛ operational child pageها فقط در صورت وجود Teacher profile mount می‌شوند. مسیر registration برای کاربری که هنوز profile ندارد مستقل باقی مانده است.

### Dashboard

- profile/status hero.
- wallet، pending requests، confirmed upcoming sessions و rating.
- جلوگیری از double count: KPI جلسات پیش‌رو فقط `confirmed` را حساب می‌کند، چون endpoint upcoming شامل pending و confirmed است.
- quick actions.
- request queue با approve/reject.
- performance summary فقط با داده واقعی.

### Workflowهای استاد

- Requests: queue کامل با learner/service/time/price/note.
- Sessions: upcoming/past و complete action.
- Services: active vs pending، edit/deactivate/delete، moderation واضح.
- Work Times: شمارنده روزهای فعال و بازه‌ها + مدیریت همان schedule واقعی.
- Reviews: average، count و five-star share بر اساس reviews واقعی.
- Wallet: ledger view و جمع credit/debit فقط روی تراکنش‌های دریافت‌شده.
- Withdrawals: فرم و تاریخچه در یک workspace با validation فعلی backend.

## Design system

Primitiveهای مشترک در `frontend/src/components/panel/PanelUI.tsx` قرار دارند و CSS مشترک با prefix `ops-*` در `frontend/src/app/globals.css` نگه‌داری می‌شود.

## Validation

در این pass build/test/npm install اجرا نشده است. Source-level audit برای توازن JSX/براکت و importهای بلااستفاده انجام شده است.
