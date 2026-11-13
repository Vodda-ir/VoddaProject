/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  compress: true,

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

  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
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
        value:
          "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://sep.shaparak.ir",
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

