import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@packages/common';
import { PerformanceMiddleware } from './performance/performance.middleware';
import { MemoryMonitorService } from './performance/memory-monitor.service';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { setupSwagger } from '@packages/config';

async function bootstrap() {
  const logger = new Logger('API-Bootstrap');

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    // 정적 파일 서빙 (아이콘 등)
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // 보안 미들웨어
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      })
    );

    // 압축 미들웨어
    app.use(compression());

    // 쿠키 파서
    app.use(cookieParser());

    // CORS 설정
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    });

    // 전역 예외 필터 (Zod 에러 처리 포함)
    app.useGlobalFilters(new AllExceptionsFilter());

    // 📊 성능 모니터링 미들웨어 전역 적용
    const performanceMiddleware = app.get(PerformanceMiddleware);
    app.use(performanceMiddleware.use.bind(performanceMiddleware));
    
    // 💾 메모리 모니터링 시작
    const memoryMonitor = app.get(MemoryMonitorService);
    memoryMonitor.startMonitoring();

    // API 접두사 설정
    app.setGlobalPrefix('api/v1');

    const port = configService.get<number>('API_PORT') || 4001;
    
    // Swagger API 문서 설정
    setupSwagger(app, {
      title: 'LMS API 문서',
      description: 'LMS 시스템의 API 문서입니다.',
      version: '1.0',
      path: 'api-docs',
    });

    await app.listen(port);

    logger.log(`🚀 API 서버가 포트 ${port}에서 실행 중입니다`);
    logger.log(`📝 API 문서: http://localhost:${port}/api-docs`);
    logger.log(`🔗 API 엔드포인트: http://localhost:${port}/api/v1`);
    logger.log(`📊 성능 모니터링: http://localhost:${port}/api/v1/admin/performance/metrics`);
    logger.log(`🔧 환경: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`✅ Zod 검증 시스템이 적용되었습니다`);
    logger.log(`✅ 성능 모니터링 시스템이 활성화되었습니다`);
    
    // 환경변수 기반 성능 로깅 설정 안내
    if (process.env.LOG_PERFORMANCE === 'true') {
      logger.log(`📊 성능 로깅이 활성화되었습니다`);
    } else {
      logger.log(`📊 성능 로깅을 활성화하려면 LOG_PERFORMANCE=true를 설정하세요`);
    }
  } catch (error) {
    logger.error('API 애플리케이션 시작 실패:', error);
    process.exit(1);
  }
}

bootstrap();
