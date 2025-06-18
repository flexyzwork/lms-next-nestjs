/** @type {import('next').NextConfig}  */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  // 🔧 workspace 패키지 transpile 설정
  transpilePackages: ['@packages/schemas'],
  
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:4000/api/v1/auth/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:4001/api/v1/:path*',
      },
    ];
  },
  
  // 🔧 HTTP 헤더 설정
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'x-next-proxy',
            value: 'true',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=60',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
  
  // 🗜️ 압축 설정
  compress: true,
  
  // 📦 Webpack 설정 (최소화)
  webpack: (config, { dev, isServer }) => {
    // 프로덕션에서 소스맵 제거
    if (!dev && !isServer) {
      config.devtool = false;
    }
    return config;
  },
  
  // 🖼️ 이미지 최적화 설정 (Next.js 15 호환)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일
  },
  
  // 📦 출력 설정
  output: 'standalone',
};

module.exports = withBundleAnalyzer(nextConfig);