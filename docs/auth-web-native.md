# قرارداد احراز هویت Web و Native در Universal App

این سند مرز امنیتی احراز هویت Universal App وُدّا را تعریف می‌کند. UI و flowهای ورود در `frontend/src/universal-app/` مشترک هستند، اما محل نگه‌داری credential و نحوه ارسال آن عمداً بین Web و Native متفاوت است.

## اصل معماری

Universal App نباید token، cookie، Next BFF یا Capacitor Secure Storage را مستقیماً مدیریت کند. کد feature فقط با `PlatformRuntime` کار می‌کند و implementation هر platform مسئول auth transport و session persistence است.

مرز ثابت:

- Web: `HttpOnly cookie + Next BFF`.
- Native: `secure token storage + Authorization: Bearer` روی Go API مستقیم.

این دو مدل نباید برای یکسان‌سازی کد transport با هم ادغام شوند.

## Web auth

پیاده‌سازی مرجع در `frontend/src/universal-app/platform/web.ts` است.

### OTP

- `requestOtp()` به auth BFF وب (`/api/auth/request-otp` به‌صورت پیش‌فرض) درخواست می‌زند.
- `verifyOtp()` به auth BFF وب (`/api/auth/verify-otp`) درخواست می‌زند.
- درخواست‌های auth با `credentials: "include"` ارسال می‌شوند.
- Universal App هیچ JWT یا access tokenی از پاسخ verify نگه نمی‌دارد و نباید به JavaScript-visible storage اضافه کند.
- BFF مسئول تبدیل پاسخ backend به session مبتنی بر cookie امن/HttpOnly است.

### درخواست‌های authenticated

- API requestهای Universal App وب از BFF (`/api/backend` به‌صورت پیش‌فرض) عبور می‌کنند.
- `credentials: "include"` برای requestهای وب اجباری است تا cookie session روی deployment هم‌origin یا same-site subdomain ارسال شود.
- featureها نباید `Authorization: Bearer` تولید کنند و نباید cookie را بخوانند.

### restore session

`restoreSession()` با request به `/me` از مسیر BFF وضعیت session را بازیابی می‌کند. پاسخ `401` به معنی session نداشتن/منقضی‌شدن است و به `null` تبدیل می‌شود.

### logout

`logout()` فقط endpoint وب (`/api/auth/logout` به‌صورت پیش‌فرض) را صدا می‌زند تا session/cookie در لایه BFF خاتمه یابد. Universal App نباید با JavaScript تلاش کند HttpOnly cookie را پاک کند.

## Native auth

پیاده‌سازی مرجع runtime در `frontend/src/universal-app/platform/native.ts` و storage واقعی در `frontend/native/src/secure-token-storage.ts` است.

### OTP

- `requestOtp()` مستقیماً `POST /auth/request-otp` را روی Go API صدا می‌زند.
- `verifyOtp()` مستقیماً `POST /auth/verify-otp` را صدا می‌زند.
- پاسخ verify شامل token است.
- token فقط از طریق `SecureTokenStorage.setToken()` ذخیره می‌شود.

### secure storage

Capacitor wrapper از `@aparajita/capacitor-secure-storage` استفاده می‌کند و token را با کلید `vodda.auth.token` نگه می‌دارد. Universal Source نباید این package، Capacitor یا کلید storage را import کند.

استفاده از `localStorage`، `sessionStorage`، IndexedDB، فایل متنی یا preference معمولی برای auth token native مجاز نیست.

### درخواست‌های authenticated

Native runtime پیش از هر request token را از secure storage می‌خواند و در صورت وجود آن header زیر را اضافه می‌کند:

```text
Authorization: Bearer <token>
```

Native نباید برای session اصلی خود به HttpOnly cookie یا Next BFF متکی باشد.

### restore session و 401

`restoreSession()` ابتدا وجود token را بررسی می‌کند و سپس `/me` را با Bearer token صدا می‌زند. اگر request authenticated با `401` برگردد، runtime token ذخیره‌شده را پاک می‌کند تا credential منقضی یا نامعتبر باقی نماند.

### logout

logout در runtime native credential محلی را از secure storage پاک می‌کند. feature layer نباید مستقیماً storage را دستکاری کند.

## قرارداد مشترک featureها

کد داخل `frontend/src/universal-app/features/` باید فقط API مشترک runtime را ببیند:

- `requestOtp(mobile)`
- `verifyOtp(mobile, code)`
- `restoreSession()`
- `logout()`
- `request<T>(path, init)`

در نتیجه flow UI یکسان می‌ماند ولی جزئیات امنیتی platform-specific در adapterها محصور می‌شوند.

## تنظیمات deployment

### Web

Next host می‌تواند این مقادیر را برای deployment `/app` یا `app.vodda.ir` تنظیم کند:

- `NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL`
- `NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL`

تغییر origin نباید باعث انتقال JWT به Universal App وب شود. حتی روی `app.vodda.ir` مدل Web همچنان cookie HttpOnly + BFF باقی می‌ماند.

### Native

Native wrapper API مستقیم را از `VITE_NATIVE_API_BASE_URL` دریافت می‌کند. این مقدار باید به Go API معتبر محیط اشاره کند؛ Next host یا `/api/backend` نباید به‌عنوان auth transport اصلی Native استفاده شوند.

## قواعد ممنوع

برای جلوگیری از شکستن مرز امنیتی، موارد زیر مجاز نیستند:

1. ذخیره JWT وب در `localStorage` یا هر storage قابل دسترس JavaScript.
2. افزودن Bearer token به `createWebPlatformRuntime`.
3. استفاده از cookie/BFF به‌عنوان credential اصلی `createNativePlatformRuntime`.
4. import کردن `next/*`، Capacitor یا secure-storage در `frontend/src/universal-app/features/`.
5. دسترسی featureها به token یا cookie برای تصمیم‌گیری business/UI.
6. یکی‌کردن logout وب و native با پاک‌کردن یک storage مشترک.

## مرجع کد

- `frontend/src/universal-app/platform/web.ts`: Web HttpOnly/BFF adapter.
- `frontend/src/universal-app/platform/native.ts`: Native Bearer adapter و handling خطای 401.
- `frontend/src/universal-app/platform/types.ts`: قرارداد مشترک runtime و storage.
- `frontend/native/src/secure-token-storage.ts`: secure token persistence در wrapper بومی.
- `docs/platform-adapter-contract.md`: قرارداد عمومی Platform Adapter.
- `docs/universal-app-web-deployment.md`: تنظیمات deployment وب و subdomain.
