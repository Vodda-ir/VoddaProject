/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  compress: true,

  // ریشهٔ فضای کاری تربوپک — در مونوریپو (اجرا از داخل frontend/) بدون این
  // مقدار، تربوپک قفل‌فایل والد را می‌بیند و tailwind نسخهٔ ۴ ریشه را به‌جای
  // نسخهٔ ۳ خود فرانت لود می‌کند و CSS لندینگ با خطای PostCSS می‌شکند.
  turbopack: {
    root: __dirname,
  },

  async rewrites() {
    // Public media is proxied directly. API traffic must pass through the
    // /api/auth and /api/backend route handlers so JWTs remain HttpOnly.
    const backend = process.env.SERVER_API_URL || 'http://backend:3420/api/v1';
    const origin = backend.replace(/\/api\/v1\/?$/, '');
    return [
      { source: '/uploads/:path*', destination: `${origin}/uploads/:path*` },
      // Compatibility for older panel code. New code should call /api/backend.
      // The destination route injects the HttpOnly JWT and enforces same-origin
      // checks for mutations; the browser-provided Authorization header is ignored.
      { source: '/api/v1/:path*', destination: '/api/backend/:path*' },
    ];
  },

  async redirects() {
    // بازنشستگی رابط‌های قدیمی وب — لندینگ در ریشه می‌ماند و مسیرهای پنل قدیمی
    // به معادل همان صفحه در اپ یونیورسال (/app) نگاشت می‌شود تا هیچ کاربر وب
    // دیگر رابط قدیمی را نبیند. ۳۰۲ است نه ۳۰۱، تا در صورت نیاز به اصلاح نقشه،
    // مرورگرها کش نکنند. پارامترهای query به‌صورت خودکار حفظ می‌شوند.
    const panelRedirects = [
      // ریشهٔ دامنهٔ اصلی = لندینگ تبلیغاتی (خودِ اپ در ریشهٔ وب نمایش داده نمی‌شود؛
      // تجربهٔ کامل اپ فقط در /app و ساب‌دامین app.vodda.ir است).
      ['/panel', '/app'],
      ['/panel/login', '/app'],
      ['/panel/live/:id', '/app/session/:id'],
      ['/panel/user', '/app'],
      ['/panel/user/wallet', '/app/wallet'],
      ['/panel/user/sessions', '/app/sessions'],
      ['/panel/user/teachers', '/app/search'],
      ['/panel/user/book', '/app/search'],
      ['/panel/user/settings', '/app/profile'],
      ['/panel/teacher', '/app/t'],
      ['/panel/teacher/requests', '/app/t/requests'],
      ['/panel/teacher/sessions', '/app/t/sessions'],
      ['/panel/teacher/services', '/app/t/services'],
      ['/panel/teacher/worktimes', '/app/t/work-times'],
      ['/panel/teacher/wallet', '/app/t/wallet'],
      ['/panel/teacher/withdrawals', '/app/t/withdraw'],
      ['/panel/teacher/reviews', '/app/t/reviews'],
      ['/panel/teacher/profile', '/app/t/profile'],
      ['/panel/teacher/dispatch', '/app/t/dispatch'],
      ['/panel/teacher/register', '/app/profile'],
      ['/panel/admin', '/app/a'],
      ['/panel/admin/:path*', '/app/a'],
      ['/panel/:path*', '/app'],
      // صفحهٔ قدیمی «فراخوان اساتید» وب هم بازنشسته شد — فراخوان در رابط تازهٔ
      // اپ (ویزارد مرحله‌ای + صفحهٔ انتظار رادار) انجام می‌شود؛ لینک‌های لندینگ
      // مستقیماً به /app/dispatch می‌روند و این مسیر هم برای بوکمارک‌های قدیمی است.
      ['/dispatch', '/app/dispatch'],
    ];
    return panelRedirects.map(([source, destination]) => ({
      source,
      destination,
      permanent: false,
    }));
  },

  async headers() {
    // حالت پیش‌نمایش محلی (VODDA_PREVIEW_MOCK=1): پنل پیش‌نمایش، اپ را داخل
    // iframe نشان می‌دهد و X-Frame-Options/frame-ancestors رندر آن را منع
    // می‌کنند (پنل خالی می‌ماند). این دو فقط در پیش‌نمایش حذف می‌شوند؛ در
    // پروداکشن متغیر هرگز ست نمی‌شود و هدرهای سخت‌گیرانه دست‌نخورده می‌مانند.
    const previewMode = process.env.VODDA_PREVIEW_MOCK === '1';
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      ...(previewMode ? [] : [{ key: 'X-Frame-Options', value: 'DENY' }]),
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        // geolocation=(self) — the ceremony venue picker needs the device GPS to
        // auto-fill city/address; a bare () silently disables the API and the
        // «استفاده از موقعیت من» button always fails.
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self)',
      },
      {
        key: 'Content-Security-Policy',
        // form-action must whitelist the Saman-Sep gateway: every payment flow
        // POSTs the bank token form straight to OnlinePG from the payer's own
        // browser (the Monafaseh-proven hand-off). Without this entry the
        // browser silently blocks the form navigation and the user never
        // reaches the bank page.
        // frame-ancestors در حالت پیش‌نمایش حذف می‌شود تا iframe پنل رندر شود.
        value: previewMode
          ? "base-uri 'self'; object-src 'none'; form-action 'self' https://sep.shaparak.ir"
          : "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://sep.shaparak.ir",
      },
    ];
    if (process.env.NODE_ENV === 'production') {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }
    return [{ source: '/(.*)', headers }];
  },
};

module.exports = nextConfig;

