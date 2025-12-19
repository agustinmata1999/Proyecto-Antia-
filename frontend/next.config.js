/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Environment variables that should be available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
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
