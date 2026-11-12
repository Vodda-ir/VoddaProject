# قرارداد توسعهٔ موازی اپ و وب‌اپ (Parity Audit)

این سند نتیجهٔ ممیزی هم‌راستایی «اپ Capacitor» و «وب‌اپ» است و قراردادهایی که
هر دو platform باید رعایت کنند را ثبت می‌کند. مرجع معماری: `docs/platform-adapter-contract.md`
و مرجع دیپلوی وب: `docs/universal-app-web-deployment.md`.

## معماری مشترک (پایهٔ پارتی)

هر دو platform از **یک سورس مشترک** اجرا می‌شوند:

| Platform | Host | مسیر اجرا |
| --- | --- | --- |
| وب (دامنه اصلی) | `vodda.ir` | `https://vodda.ir/app/...` |
| وب (ساب‌دامین اپ) | `app.vodda.ir` | روت (`/`) — nginx داخلی به `/app` مپ می‌کند |
| اپ Capacitor | WebView بومی | build از `frontend/native/` با Vite |

- سورس مشترک: `frontend/src/universal-app/` — features، UI، theme، فونت، RTL
- لایهٔ platform: `platform/web.ts` (کوکی HttpOnly + BFF) و `platform/native.ts`
  (Bearer + secure storage) طبق قرارداد adapter
- تم/فونت مشترک: `ui/theme.ts` + `ui/UniversalVisualStyles.tsx` (IRANYekanXFaNum،
  زیتونی/کرم/طلایی، RTL) — هر دو host یکسان رندر می‌شوند

## تنظیمات سرور (وریفای‌شده 2026-11-12)

- nginx: بلاک‌های `vodda.ir`، `app.vodda.ir` (rewrite داخلی بدون تغییر URL)،
  `api.vodda.ir` (پروکسی مستقیم به بک‌اند Go) فعال‌اند.
- DNS/CDN: هر دو ساب‌دامین از بیرون پاسخ می‌دهند (app: 200، api: `/health` OK).
- `UNIVERSAL_APP_ROOT_HOST=app.vodda.ir` و `BFF_ALLOWED_HOSTS=vodda.ir,www.vodda.ir,app.vodda.ir,…`
  روی کانتینر فرانت ست شده است.
- `CORS_ALLOWED_ORIGINS=https://vodda.ir,https://app.vodda.ir,https://localhost,capacitor://localhost`
  روی بک‌اند ست شده است (اپ اندروید/iOS آینده همین مبدأها را استفاده می‌کند).
- درگاه سامان: `SAMAN_TERMINAL_ID` و `SITE_URL=https://vodda.ir`؛ وریفای با
  VerifyTransaction بدون اعتبارنامه (پورت منافسه) — یکسان برای وب و اپ.
- `frontend/native/.env.production` → `VITE_NATIVE_API_BASE_URL=https://api.vodda.ir/api/v1`.

## قرارداد لندینگ پرداخت (`return_to`)

قبل از این قرارداد، بعد از راند‌تریپ درگاه همه به مسیرهای پنل قدیمی
(`/panel/user/wallet` و `/panel/user/sessions`) برمی‌گشتند که در `app.vodda.ir`
مسیر شکسته است و تجربهٔ اپ را می‌شکند.

- کلاینت هنگام ساختن سفارش، `return_to` می‌فرستد: مقادیر مجاز فقط مسیرهای
  نسبی شروع‌شده با `/app` (`sanitizeReturnPath` در `usecase/payment.go` — بدون
  query/hash/traversal، حداکثر ۲۵۵ کاراکتر). مقدار نامعتبر یا غایب → لندینگ
  پنل قدیمی (سازگاری با کلاینت‌های قبلی).
- ثابت‌های کلاینت در `frontend/src/universal-app/features/payments/landing.ts`:
  - `APP_LANDING_SESSIONS = "/app/sessions"` (رزرو، پرداخت مجدد، فراخوان)
  - `APP_LANDING_WALLET = "/app/wallet"` (شارژ کیف پول)
- مسیرها همیشه زیر `/app` هستند چون کال‌بک بانک روی مبدأ عمومی
  (`FRONTEND_BASE_URL=https://vodda.ir`) فرود می‌آید.
- ستون `payment_orders.return_path` با AutoMigrate اضافه می‌شود.
- endpoints مصرف‌کننده: `POST /wallet/topup`، `POST /sessions`،
  `POST /sessions/:id/pay`، `POST /dispatch/calls/:id/choose` — همه فیلد
  `return_to` را می‌پذیرند (binding سخت‌گیرانه؛ فیلد در structها ثبت شده است).
- بعد از راند‌تریپ، BFF کاربر را با `?payment=success|verify|failed&ref=…`
  به مقصد می‌فرستد؛ بنر `PaymentResultBanner` در `/app/wallet` و
  `/app/sessions` این نتیجه را نشان می‌دهد و پارامترها را از URL پاک می‌کند.

## شارژ کیف پول در اپ یونیورسال

قبلاً فقط پنل قدیمی وب شارژ داشت؛ الان `/app/wallet` کارت «شارژ کیف پول» دارد
(مبلغ‌های پیشنهادی ۱۰۰/۲۵۰/۵۰۰ هزار و ۱ میلیون تومان + مبلغ دلخواه) با همان
محدودهای بک‌اند (۱۰ هزار تا ۱۰۰ میلیون تومان) و همان فرم POST توکن به OnlinePG
(`lib/saman-gate.ts`) — دقیقاً مثل منافسه و پنل قدیمی.

## قواعد توسعهٔ موازی

1. هر feature جدید فقط در `frontend/src/universal-app/` نوشته شود؛ هیچ کپی
   feature-specific بین native و Next host مجاز نیست.
2. هر قابلیت device-specific از `PlatformRuntime.capabilities` تزریق شود؛
   web runtime برای `media` فعلاً fallback `<input type="file">` دارد و native
   از Capacitor Camera استفاده می‌کند.
3. برای endpointهای جدید بک‌اند، هر دو مسیر حمل credential باید کار کند:
   BFF (`/api/backend/...` + whitelist عمومی اگر لازم است) و CORS مستقیم اپ.
4. `binding.EnableDecoderDisallowUnknownFields` فعال است — هر فیلد جدید JSON
   باید قبل از ارسال از کلاینت، در struct هندلر بک‌اند ثبت و بک‌اند زودتر
   دیپلوی شود.
5. پس از هر تغییر، هر دو بیلد سبز شود: `npm run build` (فرانت)،
   `npm --prefix native run build` (اپ)، `go build ./...` (بک‌اند).
