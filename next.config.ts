import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://fonts.googleapis.com",
      "img-src 'self' data: blob: *.supabase.co https://img.clerk.com https://*.clerk.accounts.dev https://*.clerk.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://images.unsplash.com https://media.tenor.com https://*.tenor.com",
      "connect-src 'self' *.supabase.co wss://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev",
      "font-src 'self' https://fonts.gstatic.com",
      "worker-src blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
    ].join('; '),
  },

];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', port: '', pathname: '/storage/v1/object/public/**' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'meownet-sr.vercel.app'] },
  },
};

export default nextConfig;
