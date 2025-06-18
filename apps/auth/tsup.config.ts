import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs'],
  clean: true,
  sourcemap: true,
  target: 'node18',
  external: [
    // NestJS 관련
    '@nestjs/common',
    '@nestjs/config',
    '@nestjs/core',
    '@nestjs/jwt',
    '@nestjs/passport',
    '@nestjs/platform-express',
    '@nestjs/swagger',
    '@nestjs/throttler',
    
    // Passport 전략들
    'passport-jwt',
    'passport-github2',
    'passport-google-oauth20',
    
    // Express 미들웨어들
    'compression',
    'helmet', 
    'cookie-parser',
    'express',
    
    // 기타 런타임 의존성
    '@prisma/client',
    'bcryptjs',
    'bullmq',
    'class-transformer',
    'class-validator',
    'ioredis',
    'reflect-metadata',
    'rxjs',
    'uuid',
    'zod',
    
    // 워크스페이스 패키지들
    '@packages/schemas',
    '@packages/common',
    '@packages/config',
    '@packages/database',
    '@packages/queue'
  ],
  // Node.js 빌트인 모듈들은 자동으로 external 처리됨
  noExternal: [], // 번들에 포함할 모듈들 (현재는 없음)
});
