/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remove standalone output - use default Next.js server
  // output: 'standalone',
  
  // Environment variables that should be available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Headers to control caching behavior
  async headers() {
    return [
      {
        // Apply to all static assets
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // HTML pages should not be cached aggressively
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  
  async rewrites() {
    // Backend URL for API proxying
    // In Kubernetes: backend service is accessible as 'backend:8001' or 'localhost:8001'
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
