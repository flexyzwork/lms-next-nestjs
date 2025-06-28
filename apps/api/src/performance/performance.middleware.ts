import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PerformanceService } from './performance.service';
import { ConfigService } from '@nestjs/config';

/**
 * 📊 성능 모니터링 미들웨어
 * 
 * 모든 HTTP 요청의 성능 데이터를 수집하고 분석합니다.
 * 실시간으로 응답 시간을 측정하고 느린 요청을 자동으로 감지합니다.
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);

  constructor(
    private readonly performanceService: PerformanceService,
    private readonly configService: ConfigService
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, url } = req;
    const requestId = this.generateRequestId();

    // 요청 시작 로깅 (개발 환경에서만)
    if (this.configService.get('LOG_PERFORMANCE') === 'true') {
      this.logger.debug(`[${requestId}] 요청 시작: ${method} ${url}`);
    }

    // 응답 완료 시 성능 데이터 기록
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const { statusCode } = res;

      // 📊 성능 데이터 기록
      this.performanceService.recordRequest({
        url,
        method,
        responseTime,
        statusCode,
      });

      // ⚠️ 느린 요청 자동 감지 및 로깅
      const slowThreshold = parseInt(
        this.configService.get('SLOW_REQUEST_THRESHOLD', '1000'),
        10
      );

      if (responseTime > slowThreshold) {
        this.logger.warn(
          `🐌 느린 요청 감지 [${requestId}]: ${method} ${url} - ${responseTime}ms (상태코드: ${statusCode})`
        );
      }

      // ❌ 서버 에러 로깅
      if (statusCode >= 500) {
        this.logger.error(
          `❌ 서버 에러 [${requestId}]: ${method} ${url} - ${responseTime}ms (상태코드: ${statusCode})`
        );
      }

      // 📈 성능 로깅 (환경변수로 제어)
      if (this.configService.get('LOG_PERFORMANCE') === 'true') {
        this.logger.log(
          `[${requestId}] 요청 완료: ${method} ${url} - ${responseTime}ms (${statusCode})`
        );
      }
    });

    next();
  }

  /**
   * 요청 ID 생성 (간단한 랜덤 ID)
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
