import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
// import { AllExceptionsFilter } from '@packages/common'; // 임시로 주석 처리
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { setupAuthSwagger } from '@packages/config';

// 임시로 직접 import
import { Catch, HttpException, HttpStatus, Logger as NestLogger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/binary';
import { ZodError } from 'zod';

@Catch()
class AllExceptionsFilter {
  private readonly logger = new NestLogger(AllExceptionsFilter.name);

  catch(exception: unknown, host: any) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status: number;
    let message: any;
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      const zodErrors = exception.errors.map((err) => {
        const path = err.path.length > 0 ? err.path.join('.') : 'root';
        return `${path}: ${err.message}`;
      });
      message = {
        message: '입력 데이터 검증에 실패했습니다',
        errors: zodErrors,
        details: exception.errors,
      };
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '서버 내부 오류가 발생했습니다';
      error = 'Internal Server Error';
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception
    );

    const errorResponse = {
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      (errorResponse as any).stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    // 정적 파일 서빙 (favicon.ico 등)
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
      })
    );

    // 압축 미들웨어
    app.use(compression());

    // 쿠키 파서
    app.use(cookieParser());

    // CORS 설정
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3003',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    });

    // 전역 예외 필터 (Zod 에러 처리 포함)
    app.useGlobalFilters(new AllExceptionsFilter());

    // API 접두사 설정
    app.setGlobalPrefix('api/v1');

    const port = configService.get<number>('PORT') || 4000;
    // Swagger API 문서 설정
    setupAuthSwagger(app, port);

    await app.listen(port);

    logger.log(`🚀 애플리케이션이 포트 ${port}에서 실행 중입니다`);
    logger.log(`📝 API 문서: http://localhost:${port}/api/v1`);
    logger.log(`🔧 환경: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`✅ Zod 검증 시스템이 적용되었습니다`);
  } catch (error) {
    logger.error('애플리케이션 시작 실패:', error);
    process.exit(1);
  }
}

bootstrap();
