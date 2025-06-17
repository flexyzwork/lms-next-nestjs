import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';

// Request 인터페이스 확장
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * 🛡️ 보안 미들웨어 설정
 * 모든 NestJS 앱에서 공통으로 사용할 보안 미들웨어를 설정합니다.
 */
export function setupSecurityMiddleware(
  app: INestApplication,
  configService: ConfigService
): void {
  // 🍪 쿠키 파서
  app.use(cookieParser());

  // 🗜️ 압축 미들웨어
  app.use(compression({
    level: 6, // 압축 레벨 (1-9, 6이 적당한 균형점)
    threshold: 1024, // 1KB 이상 파일만 압축
    filter: (req: Request, res: Response) => {
      // 이미 압축된 콘텐츠는 제외
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // 🛡️ 보안 헤더 설정
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          scriptSrc: ["'self'", "'unsafe-eval'"], // 개발환경에서 필요할 수 있음
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // Next.js와의 호환성을 위해
      hsts: {
        maxAge: 31536000, // 1년
        includeSubDomains: true,
        preload: true
      },
      referrerPolicy: { policy: 'same-origin' }
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
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'x-request-id',
      'x-correlation-id',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'x-request-id',
      'x-correlation-id'
    ],
    maxAge: 86400, // 24시간 preflight 캐시
  });
}

/**
 * 🔧 개발환경 전용 미들웨어
 * 개발 시에만 필요한 미들웨어를 설정합니다.
 */
export function setupDevelopmentMiddleware(
  app: INestApplication,
  configService: ConfigService
): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // 개발환경에서는 더 관대한 CSP 정책 적용
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
        },
      },
    })
  );
}

/**
 * 🔍 요청 로깅 미들웨어
 * 요청/응답을 로깅합니다 (개발환경에서만 상세 로깅)
 */
export function setupRequestLogging(
  app: INestApplication,
  configService: ConfigService
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logSensitiveData = configService.get('security.logging.logSensitiveData', false);

  // 요청 ID 추가 미들웨어
  app.use((req: Request, res: Response, next: NextFunction) => {
    // 요청 ID 생성 (추적용)
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('x-request-id', req.requestId);
    
    // 개발환경에서만 상세 로깅
    if (isDevelopment && logSensitiveData) {
      console.log(`🔍 [${req.requestId}] ${req.method} ${req.url}`);
      console.log(`   User-Agent: ${req.get('User-Agent')}`);
      console.log(`   IP: ${req.ip || req.connection.remoteAddress}`);
    }
    
    next();
  });
}

/**
 * 📊 헬스체크 엔드포인트 설정
 * 기본적인 헬스체크 엔드포인트를 추가합니다.
 */
export function setupHealthCheck(
  app: INestApplication,
  serviceName: string
): void {
  // 기본 헬스체크 라우트
  app.use('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // 간단한 ping 엔드포인트
  app.use('/ping', (req: Request, res: Response) => {
    res.send('pong');
  });
}

/**
 * 🏗️ 전체 미들웨어 설정
 * 모든 필요한 미들웨어를 한 번에 설정합니다.
 */
export function setupAllMiddleware(
  app: INestApplication,
  configService: ConfigService,
  serviceName: string
): void {
  // 요청 로깅 (가장 먼저)
  setupRequestLogging(app, configService);
  
  // 보안 미들웨어
  setupSecurityMiddleware(app, configService);
  
  // 개발환경 전용 미들웨어
  setupDevelopmentMiddleware(app, configService);
  
  // 헬스체크 엔드포인트
  setupHealthCheck(app, serviceName);
  
  // API 접두사 설정
  app.setGlobalPrefix('api/v1');
}
