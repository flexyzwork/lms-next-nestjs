import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  sourcemap: true,
  target: 'node16',
  dts: true, // TypeScript 선언 파일 생성
  external: [
    // NestJS 관련
    '@nestjs/common',
    '@nestjs/config',
    '@nestjs/core',
    '@nestjs/jwt',
    '@nestjs/passport',
    
    // Express 미들웨어들
    'compression',
    'helmet', 
    'cookie-parser',
    'express',
    
    // 기타 런타임 의존성
    '@prisma/client',
    '@paralleldrive/cuid2',
    'reflect-metadata',
    'rxjs',
    'zod'
  ],
  // Node.js 빌트인 모듈들은 자동으로 external 처리됨
  noExternal: [], // 번들에 포함할 모듈들 (현재는 없음)
});