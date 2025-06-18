import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import { setupAuthSwagger } from '@packages/config';
import { AllExceptionsFilter } from '@packages/common';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

/**
 * 🚀 인증 서비스 부트스트랩
 * NestJS 기반 마이크로서비스 인증 서버를 시작합니다.
 */
async function bootstrap() {
  const logger = new Logger('Auth-Bootstrap');

  try {
    // 🏗️ NestJS 애플리케이션 생성
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    // 📁 정적 파일 서빙 (favicon.ico 등)
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // 🍪 쿠키 파서
    app.use(cookieParser());

    // 🗜️ 압축 미들웨어
    app.use(compression({
      level: 6,
      threshold: 1024,
    }));

    // 🛡️ 보안 헤더 설정
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
      })
    );

    // 🌐 CORS 설정
    const corsConfig = configService.get('security.cors');
    app.enableCors({
      origin: corsConfig?.allowedOrigins || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
      ],
      credentials: corsConfig?.credentials ?? true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    });

    // ⚠️ 전역 예외 필터 적용 (Zod 에러 처리 포함)
    app.useGlobalFilters(new AllExceptionsFilter());

    // 📋 요청 로깅 미들웨어 추가
    app.use((req: any, res: any, next: any) => {
      const start = Date.now();
      const { method, originalUrl } = req;
      
      logger.debug(`→ ${method} ${originalUrl}`);
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        logger.debug(`← ${method} ${originalUrl} ${statusCode} (+${duration}ms)`);
      });
      
      next();
    });

    // 🔗 API 접두사 설정
    app.setGlobalPrefix('api/v1');

    // 📝 Swagger API 문서 설정
    const port = configService.get<number>('PORT') || 4000;
    if (process.env.NODE_ENV !== 'production') {
      try {
        setupAuthSwagger(app, port);
      } catch (error) {
        logger.warn('Swagger 설정을 건너뜁니다:', error.message);
      }
    }

    // 🚀 서버 시작
    await app.listen(port);

    // 📊 시작 완료 로깅
    const securityConfig = configService.get('security.bruteForce');
    
    logger.log('🚀 인증 서비스가 성공적으로 시작되었습니다!');
    logger.log(`📍 서버 포트: ${port}`);
    logger.log(`📝 API 문서: http://localhost:${port}/api-docs`);
    logger.log(`🔗 API 기본 경로: http://localhost:${port}/api/v1`);
    logger.log(`🔧 환경: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🛡️ 보안 설정:`);
    logger.log(`   - 최대 로그인 시도: ${securityConfig?.maxLoginAttempts || 5}회`);
    logger.log(`✅ Zod 검증 시스템이 활성화되었습니다`);
    logger.log(`🔍 헬스체크: http://localhost:${port}/api/v1/auth/health`);
    logger.log(`💡 인증 테스트: 스웨거에서 /auth/login 후 Authorize 버튼 클릭`);

  } catch (error) {
    logger.error('❌ 인증 서비스 시작 실패:', error);
    process.exit(1);
  }
}

// 🔧 처리되지 않은 예외 처리
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('처리되지 않은 Promise 거부:', reason);
});

process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('처리되지 않은 예외:', error);
  process.exit(1);
});

// 🚀 서비스 시작
bootstrap();
