/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Environment variables that should be available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  async rewrites() {
    // In production (Kubernetes), the ingress handles /api/* routing
    // In development, we proxy to the local backend
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Let the ingress handle API routing in production
      // The backend is accessible at the same domain via /api path
      return [];
    }
    
    // Development: proxy to local backend
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
