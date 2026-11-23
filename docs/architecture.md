<div dir="rtl">

# معماری وُدّا

## نمای کلی

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  app (Flutter) │   │ frontend (Next) │   │   مرورگر    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │  HTTP/JSON         │ /api/v1 (proxy)   │
       └────────────────────┼────────────────────┘
                            ▼
                  ┌───────────────────┐
                  │  backend (Go/Gin) │  :3420
                  └─────────┬─────────┘
                            ▼
                       ┌─────────┐
                       │  MySQL  │  :3422
                       └─────────┘
```

## بک‌اند — Clean Architecture

لایه‌ها از داخل به بیرون (وابستگی همیشه به سمت داخل):

```
backend/internal/
├── domain/          # موجودیت‌ها + قراردادهای ریپازیتوری + خطاها (هستهٔ مستقل)
│   ├── entities.go
│   ├── repository.go
│   └── errors.go
├── usecase/         # منطق کسب‌وکار (auth, user, teacher, session, wallet, review, admin)
├── repository/      # پیاده‌سازی GORM برای قراردادهای domain
├── platform/        # سرویس‌های بیرونی: database, token(JWT), sms, ...
├── delivery/http/   # Gin: router, middleware, handlers, response
└── seed/            # دیتای نمونه
cmd/server/main.go   # wiring همهٔ لایه‌ها (composition root)
```

**اصل کلیدی:** `domain` به هیچ فریم‌ورکی وابسته نیست. `usecase` فقط به interfaceهای `domain` وابسته است. `delivery` و `repository` به سمت داخل وابسته‌اند. تعویض MySQL یا Gin بدون تغییر منطق کسب‌وکار ممکن است.

### جریان یک درخواست

```
HTTP → middleware (auth/role/cors) → handler (DTO + validation)
     → usecase (business rules) → repository (SQL) → MySQL
```

### منطق مالی (Escrow)

1. **رزرو:** هزینهٔ جلسه از کیف پول قرآن‌آموز کسر و در دفتر کل ثبت می‌شود (hold).
2. **رد/لغو:** مبلغ به‌صورت کامل بازگردانده می‌شود.
3. **اتمام جلسه:** کارمزد پلتفرم (`PLATFORM_COMMISSION_PERCENT`، پیش‌فرض ۱۵٪) کسر و مابقی به کیف پول استاد واریز می‌شود.
4. **برداشت:** استاد درخواست برداشت می‌دهد (مبلغ رزرو می‌شود)؛ ادمین آن را پرداخت یا رد (بازگشت وجه) می‌کند.

## فرانت‌اند — Next.js (App Router)

```
frontend/src/
├── app/
│   ├── page.tsx              # وبسایت عمومی (لندینگ)
│   ├── panel/user/           # پنل قرآن‌آموز
│   ├── panel/teacher/        # پنل استاد
│   └── panel/admin/          # پنل مدیریت
├── components/               # PanelShell, Brand, ...
└── lib/api.ts                # کلاینت API
```

درخواست‌های `/api/v1/*` در `next.config.js` به سرویس بک‌اند پراکسی می‌شوند (same-origin برای مرورگر).

## اپ Flutter — Clean Architecture + Riverpod

```
app/lib/
├── core/            # theme, network(Dio), router(go_router), providers, utils
└── features/<feature>/
    ├── domain/      # entityها
    ├── data/        # repository + providerها
    └── presentation/# screenها + widgetها
```

- **مدیریت state:** Riverpod (`FutureProvider`, `Provider`).
- **مسیریابی:** go_router با `redirect` مبتنی بر وضعیت احراز هویت.
- **شبکه:** Dio با interceptor برای الصاق توکن.
- **RTL:** کل اپ با `Directionality.rtl` و فارسی‌سازی اعداد (`core/utils/fa.dart`).

</div>
