# قرارداد Platform Adapter در Universal App

این سند قرارداد مرجع لایهٔ platform برای `frontend/src/universal-app/` است. هدف این لایه این است که featureها و UI مشترک بدون import مستقیم از Next.js، Capacitor یا storage بومی روی وب و native اجرا شوند.

## مرز معماری

Universal Source فقط با `PlatformRuntime` کار می‌کند. host وب و wrapper بومی مسئول ساخت implementation مناسب و تزریق آن از طریق `PlatformProvider` هستند.

- قرارداد مشترک: `frontend/src/universal-app/platform/types.ts`
- context و تزریق runtime: `frontend/src/universal-app/platform/context.tsx`
- HTTP مشترک: `frontend/src/universal-app/platform/http.ts`
- Web adapter: `frontend/src/universal-app/platform/web.ts`
- Native adapter: `frontend/src/universal-app/platform/native.ts`

در `frontend/src/universal-app/` نباید برای حل نیازهای platform-specific، `next/*`، Capacitor pluginها یا secure-storage packageها مستقیماً import شوند. هر قابلیت platform-specific باید پشت `PlatformRuntime` یا `PlatformRuntime.capabilities` قرار بگیرد.

## PlatformRuntime

```ts
interface PlatformRuntime {
  readonly kind: "web" | "native";
  readonly apiBaseUrl: string;
  readonly capabilities?: PlatformCapabilities;

  request<T>(path: string, init?: PlatformRequestInit): Promise<T>;
  requestOtp(mobile: string): Promise<void>;
  verifyOtp(mobile: string, code: string): Promise<VerifyOtpResult>;
  restoreSession(): Promise<AuthUser | null>;
  logout(): Promise<void>;
}
```

### `kind`

برای تفاوت‌های محدود رفتاری یا نمایشی که واقعاً به platform وابسته‌اند استفاده می‌شود. business logic نباید بر اساس `kind` endpoint متفاوتی اختراع کند؛ endpoint mapping وظیفهٔ adapter است.

### `apiBaseUrl`

آدرس پایهٔ API همان runtime است. در وب معمولاً BFF است و در native آدرس مستقیم Go API. featureها باید درخواست را با path نسبی مانند `/me` یا `/teacher/sessions` به `request()` بدهند و URL کامل نسازند.

### `request<T>()`

درگاه واحد درخواست‌های authenticated و business API است.

- path باید relative-to-runtime باشد.
- header یا credential امنیتی توسط feature ساخته نمی‌شود.
- `FormData` باید بدون set کردن دستی `Content-Type` ارسال شود تا boundary توسط fetch ساخته شود.
- خطاهای HTTP از `requestJson` به شکل `PlatformHttpError` با `status` و `body` استاندارد می‌شوند.
- `cache: "no-store"` در helper مشترک اعمال می‌شود.

## قرارداد Auth

Featureهای auth فقط متدهای `requestOtp`، `verifyOtp`، `restoreSession` و `logout` را مصرف می‌کنند. محل نگهداری credential جزو قرارداد feature نیست.

### Web runtime

`createWebPlatformRuntime()` باید مدل فعلی وب را حفظ کند:

- APIهای business از BFF با default `/api/backend` عبور می‌کنند.
- OTP/logout از auth BFF با default `/api/auth` عبور می‌کنند.
- درخواست‌ها با `credentials: "include"` انجام می‌شوند.
- JavaScript در Universal App نباید access token را بخواند، نگهداری کند یا Bearer header بسازد.
- `restoreSession()` از `/me` استفاده می‌کند و فقط 401 را به session خالی (`null`) تبدیل می‌کند؛ خطاهای دیگر باید propagate شوند.

### Native runtime

`createNativePlatformRuntime()` باید API مستقیم Go را مصرف کند:

- `apiBaseUrl` اجباری و environment/configurable است.
- token فقط از `SecureTokenStorage` خوانده می‌شود.
- `request()` در صورت وجود token، `Authorization: Bearer <token>` را اضافه می‌کند.
- `verifyOtp()` token پاسخ backend را در secure storage ذخیره می‌کند.
- `restoreSession()` بدون token مستقیماً `null` برمی‌گرداند و در صورت 401 نیز session را خالی در نظر می‌گیرد.
- 401 روی request authenticated باعث پاک شدن token ذخیره‌شده می‌شود.
- `logout()` credential محلی را پاک می‌کند؛ Web logout semantics نباید به native منتقل شود.

`SecureTokenStorage` فقط سه عملیات دارد: `getToken`، `setToken` و `clearToken`. implementation واقعی storage متعلق به native wrapper است، نه Universal Source.

## Platform Capabilities

قابلیت‌های device-specific باید optional و capability-driven باشند:

```ts
interface PlatformCapabilities {
  media?: PlatformMediaCapabilities;
}
```

در حال حاضر `media.pickImage()` قرارداد انتخاب تصویر را ارائه می‌دهد و native wrapper آن را با Capacitor Camera/Photo Picker پیاده می‌کند. feature باید ابتدا وجود capability را بررسی کند و برای نبود capability رفتار امن یا fallback داشته باشد.

برای افزودن قابلیت جدید:

1. type کوچک و framework-independent در `platform/types.ts` تعریف شود.
2. capability به `PlatformCapabilities` اضافه شود.
3. implementation فقط در host/wrapper مربوطه ساخته شود.
4. runtime هنگام construction آن capability را inject کند.
5. Universal feature فقط interface را مصرف کند؛ import مستقیم plugin ممنوع است.

جزئیات Camera/Image Picker در `docs/native-capabilities.md` ثبت شده است.

## Provider و lifecycle

`PlatformProvider` یک runtime ساخته‌شده را در ریشهٔ Universal App تزریق می‌کند و `usePlatform()` تنها مسیر استاندارد دسترسی component/featureها به platform است. runtime نباید در هر screen دوباره ساخته شود؛ host باید آن را در boundary اپ ایجاد کند.

## قواعد توسعه

- routeهای `/panel/...` بخشی از این قرارداد نیستند و Universal App نباید برای API یا navigation به آن‌ها وابسته شود.
- هیچ feature مشترکی hostname، BFF origin یا native API origin را hardcode نکند.
- Web credential همیشه HttpOnly/BFF باقی می‌ماند؛ token storage یا Bearer در web adapter اضافه نشود.
- Native credential همیشه secure token/Bearer باقی می‌ماند؛ cookie/session وابسته به Next به native adapter اضافه نشود.
- business response contract بین web/native یکی است؛ adapter فقط transport/auth boundary را متفاوت می‌کند.
- `scheduled_at` و `local_*`، moderation policy و سایر قراردادهای authoritative backend نباید در adapter بازتعریف شوند.

## چه چیزی خارج از Platform Adapter است؟

Routing داخلی، design system، learner/teacher featureها، validationهای business و mapping داده‌های backend به UI داخل Universal Source باقی می‌مانند. Platform Adapter فقط transport، session boundary و capabilityهای محیط اجرا را abstract می‌کند.