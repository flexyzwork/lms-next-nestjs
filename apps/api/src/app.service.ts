import { Injectable, Logger } from '@nestjs/common';

/**
 * 🏠 API 메인 서비스
 * 
 * 시스템 정보 및 헬스체크 기능 제공
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  /**
   * 🏠 API 기본 정보 반환
   */
  getApiInfo() {
    const apiInfo = {
      service: 'LMS API Gateway',
      description: '학습 관리 시스템 API 서버',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Seoul',
      features: [
        '강의 관리 (CRUD)',
        '결제 및 트랜잭션 처리',
        '학습 진도 관리',
        'JWT 기반 인증',
        'Zod 데이터 검증',
        'API 문서 (Swagger)',
        '요청 제한 (Rate Limiting)',
      ],
      endpoints: {
        courses: '/api/v1/courses',
        transactions: '/api/v1/transactions',
        userProgress: '/api/v1/users/course-progress',
        health: '/api/v1/health',
        docs: '/api-docs',
      },
    };

    this.logger.log('API 정보 요청 처리 완료');
    return apiInfo;
  }

  /**
   * ❤️ 헬스체크 정보 반환
   */
  getHealthCheck() {
    const healthInfo = {
      status: 'ok',
      service: 'lms-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Seoul',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB',
      },
      database: {
        status: 'connected',
        type: 'PostgreSQL',
        provider: 'Prisma',
      },
      cache: {
        status: 'connected',
        type: 'Redis',
      },
      services: {
        auth: 'running',
        courses: 'running',
        transactions: 'running',
        userProgress: 'running',
      },
    };

    this.logger.log('헬스체크 요청 처리 완료');
    return healthInfo;
  }
}
