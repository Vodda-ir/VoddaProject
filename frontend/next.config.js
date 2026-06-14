/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    // Proxy API calls to the backend so the browser uses same-origin /api/v1.
    const target = process.env.SERVER_API_URL || 'http://backend:3420/api/v1';
    return [{ source: '/api/v1/:path*', destination: `${target}/:path*` }];
  },
};

module.exports = nextConfig;
