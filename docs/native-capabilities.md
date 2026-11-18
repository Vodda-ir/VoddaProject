# Native capability adapter

Universal App نباید مستقیماً هیچ package مربوط به Capacitor را import کند. قابلیت‌های device-specific از طریق `PlatformRuntime.capabilities` تزریق می‌شوند و wrapper هر platform مسئول implementation است.

## Media picker

قرارداد مشترک در `frontend/src/universal-app/platform/types.ts` شامل `PlatformCapabilities.media.pickImage()` است. این متد یک `File` استاندارد وب یا `null` در صورت لغو کاربر برمی‌گرداند تا featureهای Universal App برای upload همچنان فقط با `File` و `FormData` کار کنند.

Implementation فعلی native در `frontend/native/src/native-capabilities.ts` از `@capacitor/camera` استفاده می‌کند و sourceهای `prompt`، `camera` و `photos` را پشتیبانی می‌کند. `frontend/native/src/main.tsx` این capability را هنگام ساخت `createNativePlatformRuntime` تزریق می‌کند.

## افزودن capability جدید

1. type/interface آن را زیر `PlatformCapabilities` تعریف کنید؛ interface مشترک نباید Capacitor type داشته باشد.
2. implementation native را در `frontend/native/src/` بسازید و package native لازم را فقط در `frontend/native/package.json` اضافه کنید.
3. capability را از `nativeCapabilities` تزریق کنید.
4. feature مشترک فقط از `usePlatform().capabilities` استفاده کند و برای web یا platform فاقد capability fallback مناسب داشته باشد.

این boundary باعث می‌شود Web auth همچنان HttpOnly/BFF بماند، Native auth همچنان secure token/Bearer باشد و Universal Source از `next/*` و Capacitor packages مستقل بماند.

## WebView media permissions (کلاس تصویری / پیام صوتی)

`android/` scaffold باید همیشه همراه repo باشد. `AndroidManifest.xml` دارای
`CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` است؛ WebView در زمان
`getUserMedia` درخواست را از طریق `BridgeWebViewController.onPermissionRequest`
به ران‌تایم اندروید منتقل می‌کند و کادر مجوز سیستم نمایش داده می‌شود.
بدون این مجوزها در manifest، WebView درخواست‌ها را بی‌صدا رد می‌کند و
نه کلاس تصویری و نه ضبط صوت پشتیبانی کار نمی‌کند.

