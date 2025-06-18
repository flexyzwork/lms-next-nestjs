import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Request 인터페이스 확장
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: bigint;
      performanceMetrics?: {
        startTime: bigint;
        memoryUsageBefore: NodeJS.MemoryUsage;
        cpuUsageBefore: NodeJS.CpuUsage;
      };
    }
  }
}

/**
 * 📊 성능 메트릭 인터페이스
 */
interface PerformanceMetric {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number; // 밀리초
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  };
  cpuUsage: {
    before: NodeJS.CpuUsage;
    after: NodeJS.CpuUsage;
    delta: {
      user: number;
      system: number;
    };
  };
  userAgent?: string;
  ip: string;
  timestamp: string;
}

/**
 * 🚀 성능 모니터링 미들웨어
 * 
 * 기능:
 * - 요청별 응답 시간 측정
 * - 메모리 사용량 변화 추적
 * - CPU 사용량 모니터링
 * - 느린 요청 자동 감지 및 알림
 * - 구조화된 성능 로그 생성
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);
  private readonly slowResponseThreshold = 1000; // 1초
  private readonly memoryLeakThreshold = 50 * 1024 * 1024; // 50MB
  
  // 성능 통계
  private performanceStats = {
    totalRequests: 0,
    slowRequests: 0,
    averageResponseTime: 0,
    maxResponseTime: 0,
    totalResponseTime: 0,
  };

  use(req: Request, res: Response, next: NextFunction): void {
    // 요청 시작 시점 기록
    const startTime = process.hrtime.bigint();
    const memoryUsageBefore = process.memoryUsage();
    const cpuUsageBefore = process.cpuUsage();

    // 요청 ID 생성 (없는 경우)
    if (!req.requestId) {
      req.requestId = this.generateRequestId();
    }

    // 성능 메트릭 초기화
    req.performanceMetrics = {
      startTime,
      memoryUsageBefore,
      cpuUsageBefore,
    };

    // 응답 완료 시 성능 데이터 수집
    res.on('finish', () => {
      this.collectPerformanceMetrics(req, res);
    });

    // 응답 에러 시에도 성능 데이터 수집
    res.on('error', () => {
      this.collectPerformanceMetrics(req, res);
    });

    next();
  }

  /**
   * 📊 성능 메트릭 수집 및 분석
   */
  private collectPerformanceMetrics(req: Request, res: Response): void {
    if (!req.performanceMetrics) {
      return;
    }

    const endTime = process.hrtime.bigint();
    const memoryUsageAfter = process.memoryUsage();
    const cpuUsageAfter = process.cpuUsage(req.performanceMetrics.cpuUsageBefore);

    // 응답 시간 계산 (밀리초)
    const duration = Number(endTime - req.performanceMetrics.startTime) / 1_000_000;

    // 메모리 사용량 변화 계산
    const memoryDelta = {
      rss: memoryUsageAfter.rss - req.performanceMetrics.memoryUsageBefore.rss,
      heapUsed: memoryUsageAfter.heapUsed - req.performanceMetrics.memoryUsageBefore.heapUsed,
      heapTotal: memoryUsageAfter.heapTotal - req.performanceMetrics.memoryUsageBefore.heapTotal,
      external: memoryUsageAfter.external - req.performanceMetrics.memoryUsageBefore.external,
    };

    // 성능 메트릭 객체 생성
    const metric: PerformanceMetric = {
      requestId: req.requestId || 'unknown',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: Math.round(duration * 100) / 100, // 소수점 2자리
      memoryUsage: {
        before: req.performanceMetrics.memoryUsageBefore,
        after: memoryUsageAfter,
        delta: memoryDelta,
      },
      cpuUsage: {
        before: req.performanceMetrics.cpuUsageBefore,
        after: cpuUsageAfter,
        delta: {
          user: cpuUsageAfter.user,
          system: cpuUsageAfter.system,
        },
      },
      userAgent: req.get('User-Agent'),
      ip: this.extractClientIp(req),
      timestamp: new Date().toISOString(),
    };

    // 통계 업데이트
    this.updatePerformanceStats(metric);

    // 성능 로그 기록
    this.logPerformanceMetric(metric);

    // 경고 조건 확인
    this.checkPerformanceAlerts(metric);
  }

  /**
   * 📈 성능 통계 업데이트
   */
  private updatePerformanceStats(metric: PerformanceMetric): void {
    this.performanceStats.totalRequests++;
    this.performanceStats.totalResponseTime += metric.duration;
    this.performanceStats.averageResponseTime = 
      this.performanceStats.totalResponseTime / this.performanceStats.totalRequests;

    if (metric.duration > this.performanceStats.maxResponseTime) {
      this.performanceStats.maxResponseTime = metric.duration;
    }

    if (metric.duration > this.slowResponseThreshold) {
      this.performanceStats.slowRequests++;
    }
  }

  /**
   * 📝 성능 로그 기록
   */
  private logPerformanceMetric(metric: PerformanceMetric): void {
    const isSlowRequest = metric.duration > this.slowResponseThreshold;
    const hasMemoryLeak = metric.memoryUsage.delta.heapUsed > this.memoryLeakThreshold;

    // 기본 성능 로그
    if (process.env.NODE_ENV === 'development' || isSlowRequest) {
      this.logger.log(
        `🔍 [${metric.requestId}] ${metric.method} ${metric.url} ` +
        `${metric.statusCode} - ${metric.duration}ms ` +
        `(메모리: ${this.formatBytes(metric.memoryUsage.delta.heapUsed)})`
      );
    }

    // 상세 성능 로그 (느린 요청 또는 개발환경)
    if (isSlowRequest || process.env.NODE_ENV === 'development') {
      this.logger.debug('상세 성능 메트릭', {
        requestId: metric.requestId,
        duration: metric.duration,
        memory: {
          heap: this.formatBytes(metric.memoryUsage.delta.heapUsed),
          rss: this.formatBytes(metric.memoryUsage.delta.rss),
        },
        cpu: {
          user: `${metric.cpuUsage.delta.user}μs`,
          system: `${metric.cpuUsage.delta.system}μs`,
        },
      });
    }

    // 경고 로그
    if (hasMemoryLeak) {
      this.logger.warn(
        `⚠️ 메모리 사용량 급증 감지: ${this.formatBytes(metric.memoryUsage.delta.heapUsed)} ` +
        `(${metric.method} ${metric.url})`
      );
    }
  }

  /**
   * 🚨 성능 경고 확인 및 알림
   */
  private checkPerformanceAlerts(metric: PerformanceMetric): void {
    // 느린 응답 경고
    if (metric.duration > this.slowResponseThreshold) {
      this.sendSlowResponseAlert(metric);
    }

    // 메모리 누수 경고
    if (metric.memoryUsage.delta.heapUsed > this.memoryLeakThreshold) {
      this.sendMemoryLeakAlert(metric);
    }

    // HTTP 에러 경고
    if (metric.statusCode >= 500) {
      this.sendServerErrorAlert(metric);
    }
  }

  /**
   * 🐌 느린 응답 알림
   */
  private sendSlowResponseAlert(metric: PerformanceMetric): void {
    const message = `🐌 느린 응답 감지
요청: ${metric.method} ${metric.url}
응답시간: ${metric.duration}ms (임계값: ${this.slowResponseThreshold}ms)
상태코드: ${metric.statusCode}
요청 ID: ${metric.requestId}
시간: ${metric.timestamp}`;

    this.logger.warn(message);
    
    // Slack 알림 (환경변수 설정 시)
    if (process.env.SLACK_WEBHOOK_URL) {
      this.sendSlackAlert(message);
    }
  }

  /**
   * 🧠 메모리 누수 알림
   */
  private sendMemoryLeakAlert(metric: PerformanceMetric): void {
    const message = `🧠 메모리 사용량 급증
요청: ${metric.method} ${metric.url}
메모리 증가: ${this.formatBytes(metric.memoryUsage.delta.heapUsed)}
현재 힙 사용량: ${this.formatBytes(metric.memoryUsage.after.heapUsed)}
요청 ID: ${metric.requestId}
시간: ${metric.timestamp}`;

    this.logger.warn(message);
    
    if (process.env.SLACK_WEBHOOK_URL) {
      this.sendSlackAlert(message);
    }
  }

  /**
   * 💥 서버 에러 알림
   */
  private sendServerErrorAlert(metric: PerformanceMetric): void {
    const message = `💥 서버 에러 발생
요청: ${metric.method} ${metric.url}
상태코드: ${metric.statusCode}
응답시간: ${metric.duration}ms
IP: ${metric.ip}
User-Agent: ${metric.userAgent}
요청 ID: ${metric.requestId}
시간: ${metric.timestamp}`;

    this.logger.error(message);
    
    if (process.env.SLACK_WEBHOOK_URL) {
      this.sendSlackAlert(message);
    }
  }

  /**
   * 📱 Slack 알림 전송
   */
  private async sendSlackAlert(message: string): Promise<void> {
    try {
      // Slack 웹훅 구현 (필요 시)
      // await fetch(process.env.SLACK_WEBHOOK_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ text: message })
      // });
    } catch (error) {
      this.logger.error('Slack 알림 전송 실패', error);
    }
  }

  /**
   * 🆔 요청 ID 생성
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🌐 클라이언트 IP 추출
   */
  private extractClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
    const realIp = req.headers['x-real-ip'] as string;

    return (
      cfConnectingIp ||
      forwardedFor?.split(',')[0]?.trim() ||
      realIp ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 📏 바이트 단위 포맷팅
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const size = (bytes / Math.pow(k, i)).toFixed(1);
    return `${bytes >= 0 ? '+' : ''}${size} ${sizes[i]}`;
  }

  /**
   * 📊 현재 성능 통계 조회
   */
  getPerformanceStats() {
    const slowRequestRate = this.performanceStats.totalRequests > 0 
      ? (this.performanceStats.slowRequests / this.performanceStats.totalRequests) * 100 
      : 0;

    return {
      ...this.performanceStats,
      slowRequestRate: Math.round(slowRequestRate * 100) / 100,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }
}