import { Injectable, Logger } from '@nestjs/common';

/**
 * 📊 성능 모니터링 서비스
 * 
 * 실제 성능 데이터 수집 및 분석
 */
@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  
  // 메모리에 성능 데이터 저장 (실제 운영에서는 Redis나 DB 사용)
  private performanceData: {
    requests: Array<{
      url: string;
      method: string;
      responseTime: number;
      timestamp: Date;
      statusCode: number;
    }>;
    startTime: Date;
  } = {
    requests: [],
    startTime: new Date()
  };

  /**
   * 요청 성능 데이터 기록
   */
  recordRequest(data: {
    url: string;
    method: string;
    responseTime: number;
    statusCode: number;
  }): void {
    this.performanceData.requests.push({
      ...data,
      timestamp: new Date()
    });

    // 메모리 사용량 제한 (최근 1000개 요청만 보관)
    if (this.performanceData.requests.length > 1000) {
      this.performanceData.requests = this.performanceData.requests.slice(-1000);
    }

    // 느린 요청 자동 로깅
    if (data.responseTime > 1000) {
      this.logger.warn(
        `느린 요청 감지: ${data.method} ${data.url} - ${data.responseTime}ms`
      );
    }
  }

  /**
   * 전체 성능 메트릭 조회
   */
  getPerformanceMetrics() {
    const requests = this.performanceData.requests;
    const totalRequests = requests.length;
    
    if (totalRequests === 0) {
      return this.getEmptyMetrics();
    }

    // 느린 요청 (1초 이상)
    const slowRequests = requests.filter(req => req.responseTime > 1000);
    const slowRate = (slowRequests.length / totalRequests) * 100;

    // 응답 시간 통계
    const responseTimes = requests.map(req => req.responseTime);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);

    // 시스템 리소스
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();

    return {
      requests: {
        total: totalRequests,
        slow: slowRequests.length,
        slowRate: Math.round(slowRate * 100) / 100,
      },
      responseTime: {
        average: Math.round(averageResponseTime * 100) / 100,
        max: maxResponseTime,
      },
      system: {
        uptime: Math.round(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 느린 엔드포인트 분석
   */
  getSlowEndpoints(limit: number = 10, threshold: number = 1000) {
    const requests = this.performanceData.requests;
    
    if (requests.length === 0) {
      return {
        threshold,
        endpoints: [],
        summary: {
          totalSlowEndpoints: 0,
          averageSlowRate: 0,
        },
      };
    }

    // 엔드포인트별 그룹화
    const endpointStats = new Map<string, {
      requests: typeof requests;
      totalRequests: number;
      slowRequests: number;
      totalResponseTime: number;
      maxResponseTime: number;
      lastSlowRequest?: Date;
    }>();

    requests.forEach(req => {
      const key = `${req.method} ${req.url}`;
      
      if (!endpointStats.has(key)) {
        endpointStats.set(key, {
          requests: [],
          totalRequests: 0,
          slowRequests: 0,
          totalResponseTime: 0,
          maxResponseTime: 0,
        });
      }
      
      const stats = endpointStats.get(key)!;
      stats.requests.push(req);
      stats.totalRequests++;
      stats.totalResponseTime += req.responseTime;
      stats.maxResponseTime = Math.max(stats.maxResponseTime, req.responseTime);
      
      if (req.responseTime > threshold) {
        stats.slowRequests++;
        if (!stats.lastSlowRequest || req.timestamp > stats.lastSlowRequest) {
          stats.lastSlowRequest = req.timestamp;
        }
      }
    });

    // 느린 엔드포인트만 필터링 및 정렬
    const slowEndpoints = Array.from(endpointStats.entries())
      .filter(([_, stats]) => stats.slowRequests > 0)
      .map(([endpoint, stats]) => ({
        endpoint,
        averageResponseTime: Math.round(stats.totalResponseTime / stats.totalRequests),
        maxResponseTime: stats.maxResponseTime,
        requestCount: stats.totalRequests,
        slowRequestCount: stats.slowRequests,
        slowRate: Math.round((stats.slowRequests / stats.totalRequests) * 10000) / 100,
        lastSlowRequest: stats.lastSlowRequest?.toISOString(),
      }))
      .sort((a, b) => b.slowRate - a.slowRate)
      .slice(0, limit);

    return {
      threshold,
      endpoints: slowEndpoints,
      summary: {
        totalSlowEndpoints: slowEndpoints.length,
        averageSlowRate: slowEndpoints.length > 0 
          ? Math.round(slowEndpoints.reduce((acc, ep) => acc + ep.slowRate, 0) / slowEndpoints.length * 100) / 100
          : 0,
      },
    };
  }

  /**
   * 메모리 사용량 히스토리 (실제로는 시계열 DB에서 조회)
   */
  getMemoryUsageHistory(period: string = '1h') {
    const currentMemory = process.memoryUsage();
    
    // 메모리 데이터가 부족할 때 현재 메모리 사용량 기반으로 추정
    const historyPoints = period === '1h' ? 12 : period === '24h' ? 24 : 12;
    const intervalMinutes = period === '1h' ? 5 : 60;
    
    const memoryHistory = Array.from({ length: historyPoints }, (_, i) => {
      const timestamp = new Date(Date.now() - (historyPoints - 1 - i) * intervalMinutes * 60 * 1000);
      
      return {
        timestamp: timestamp.toISOString(),
        heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024),
        rss: Math.round(currentMemory.rss / 1024 / 1024),
        external: Math.round(currentMemory.external / 1024 / 1024),
      };
    });

    return {
      period,
      current: {
        heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024),
        rss: Math.round(currentMemory.rss / 1024 / 1024),
        external: Math.round(currentMemory.external / 1024 / 1024),
      },
      history: memoryHistory,
      trends: {
        heapGrowth: this.calculateTrend(memoryHistory.map(h => h.heapUsed)),
        memoryLeaks: this.detectMemoryLeaks(memoryHistory),
      },
    };
  }

  /**
   * 시스템 헬스체크
   */
  getSystemHealth() {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    const requests = this.performanceData.requests;
    
    // 헬스 점수 계산
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    const memoryScore = Math.max(0, 100 - memoryUsagePercent);
    
    // 최근 요청들의 평균 응답 시간
    const recentRequests = requests.slice(-100); // 최근 100개 요청
    const averageResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length
      : 0;
    
    const responseTimeScore = Math.max(0, 100 - (averageResponseTime / 20)); // 2초 = 0점
    
    // 에러율 계산
    const errorRequests = recentRequests.filter(req => req.statusCode >= 500);
    const errorRate = recentRequests.length > 0 ? (errorRequests.length / recentRequests.length) * 100 : 0;
    const errorRateScore = Math.max(0, 100 - (errorRate * 10)); // 10% 에러율 = 0점
    
    const overallScore = Math.round((memoryScore + responseTimeScore + errorRateScore) / 3);
    
    let healthStatus = 'healthy';
    if (overallScore < 60) healthStatus = 'critical';
    else if (overallScore < 80) healthStatus = 'warning';
    
    return {
      status: healthStatus,
      score: overallScore,
      details: {
        memory: {
          score: Math.round(memoryScore),
          usage: Math.round(memoryUsagePercent),
          status: memoryScore > 70 ? 'good' : memoryScore > 50 ? 'warning' : 'critical',
        },
        performance: {
          score: Math.round(responseTimeScore),
          averageResponseTime: Math.round(averageResponseTime),
          status: responseTimeScore > 70 ? 'good' : responseTimeScore > 50 ? 'warning' : 'critical',
        },
        reliability: {
          score: Math.round(errorRateScore),
          errorRate: Math.round(errorRate * 100) / 100,
          status: errorRateScore > 70 ? 'good' : errorRateScore > 50 ? 'warning' : 'critical',
        },
      },
      uptime: Math.round(uptime),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 빈 메트릭 반환 (데이터가 없을 때)
   */
  private getEmptyMetrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();

    return {
      requests: {
        total: 0,
        slow: 0,
        slowRate: 0,
      },
      responseTime: {
        average: 0,
        max: 0,
      },
      system: {
        uptime: Math.round(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 트렌드 계산
   */
  private calculateTrend(values: number[]): string {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * 메모리 누수 감지
   */
  private detectMemoryLeaks(history: Array<{ heapUsed: number }>): number {
    return history.filter((point, i, arr) => 
      i > 0 && point.heapUsed > arr[i-1].heapUsed * 1.1
    ).length;
  }
}
