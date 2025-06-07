/** @type {import('next').NextConfig}  */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        // destination: 'http://auth:4000/api/v1/auth/:path*', // ✅ NestJS Auth API (포트 4000)
        destination: 'http://localhost:4000/api/v1/auth/:path*', // ✅ NestJS Auth API (포트 4000)
      },
      {
        source: '/api/:path*',
        // destination: 'http://backend:4001/:path*',
        destination: 'http://localhost:4001/:path*',
      },
    ];
  },
  // 🔧 더 상세한 로깅을 위한 설정
  async headers() {
    return [
      {
        // 모든 API 경로에 대해
        source: '/api/:path*',
        headers: [
          {
            key: 'x-next-proxy',
            value: 'true',
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
