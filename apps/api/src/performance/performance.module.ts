import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PerformanceDashboardController } from './performance-dashboard.controller';
import { PerformanceService } from './performance.service';
import { PerformanceMiddleware } from './performance.middleware';
import { MemoryMonitorService } from './memory-monitor.service';

/**
 * 📊 성능 모니터링 모듈
 * 
 * 기능:
 * - 실시간 성능 메트릭 제공
 * - 시스템 헬스체크
 * - 메모리 및 CPU 모니터링
 * - 느린 엔드포인트 분석
 * - 성능 데이터 수집 미들웨어
 */
@Module({
  imports: [ConfigModule],
  controllers: [PerformanceDashboardController],
  providers: [
    PerformanceService,
    PerformanceMiddleware,
    MemoryMonitorService,
  ],
  exports: [
    PerformanceService,
    PerformanceMiddleware,
    MemoryMonitorService,
  ],
})
export class PerformanceModule {}
