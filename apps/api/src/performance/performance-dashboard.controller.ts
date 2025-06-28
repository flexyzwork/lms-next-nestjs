import { Controller, Get, Query } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { MemoryMonitorService } from './memory-monitor.service';

/**
 * 📊 성능 대시보드 컨트롤러
 * 
 * 기능:
 * - 실시간 성능 메트릭 조회
 * - 느린 엔드포인트 분석
 * - 시스템 리소스 모니터링
 * - 메모리 모니터링 및 분석
 * - 성능 경고 및 알림 관리
 */
@Controller('admin/performance')
export class PerformanceDashboardController {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly memoryMonitorService: MemoryMonitorService
  ) {}
  
  /**
   * 📈 전체 성능 메트릭 조회
   */
  @Get('metrics')
  async getPerformanceMetrics() {
    const metrics = this.performanceService.getPerformanceMetrics();
    
    return {
      message: '성능 메트릭 조회 성공',
      data: metrics,
      optimized: true, // 최적화 완료 플래그
    };
  }

  /**
   * 🐌 느린 엔드포인트 분석
   */
  @Get('slow-endpoints')
  async getSlowEndpoints(
    @Query('limit') limit: string = '10',
    @Query('threshold') threshold: string = '1000'
  ) {
    const slowEndpoints = this.performanceService.getSlowEndpoints(
      parseInt(limit), 
      parseInt(threshold)
    );

    return {
      message: '느린 엔드포인트 분석 완료',
      data: slowEndpoints,
    };
  }

  /**
   * 💾 메모리 사용량 상태
   */
  @Get('memory')
  async getMemoryStatus() {
    const memoryStatus = this.memoryMonitorService.getCurrentMemoryStatus();
    const memoryTrend = this.memoryMonitorService.getMemoryTrend();

    return {
      message: '메모리 상태 조회 성공',
      data: {
        current: memoryStatus,
        trend: memoryTrend,
      },
    };
  }

  /**
   * 📊 메모리 사용량 히스토리
   */
  @Get('memory-usage')
  async getMemoryUsage(@Query('period') period: string = '1h') {
    const memoryData = this.performanceService.getMemoryUsageHistory(period);

    return {
      message: '메모리 사용량 조회 성공',
      data: memoryData,
    };
  }

  /**
   * 📊 시스템 헬스체크
   */
  @Get('health')
  async getSystemHealth() {
    const healthData = this.performanceService.getSystemHealth();
    const memoryStatus = this.memoryMonitorService.getCurrentMemoryStatus();
    
    return {
      message: '시스템 헬스체크 완료',
      data: {
        ...healthData,
        memory: {
          ...healthData.details.memory,
          monitoring: memoryStatus.status,
          thresholds: memoryStatus.thresholds,
        },
      },
    };
  }

  /**
   * 🔄 메모리 모니터링 제어
   */
  @Get('memory/restart-monitoring')
  async restartMemoryMonitoring() {
    this.memoryMonitorService.stopMonitoring();
    this.memoryMonitorService.startMonitoring();
    
    return {
      message: '메모리 모니터링 재시작 완료',
      data: {
        status: 'restarted',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
