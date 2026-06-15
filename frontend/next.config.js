/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Allow overriding the build dir (host .next can be root-owned by the dev container).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async rewrites() {
    // Proxy API calls to the backend so the browser uses same-origin /api/v1.
    const target = process.env.SERVER_API_URL || 'http://backend:3420/api/v1';
    return [{ source: '/api/v1/:path*', destination: `${target}/:path*` }];
  },
};

module.exports = nextConfig;
