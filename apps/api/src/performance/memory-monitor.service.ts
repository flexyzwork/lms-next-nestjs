import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 📈 메모리 모니터링 서비스
 * 
 * 주기적으로 메모리 사용량을 체크하고 임계치 초과 시 경고합니다.
 * 자동 가비지 컬렉션 기능도 포함되어 있습니다.
 */
@Injectable()
export class MemoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryMonitorService.name);
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  // 환경변수에서 설정 로드
  private readonly memoryWarningThreshold: number;
  private readonly memoryCriticalThreshold: number;
  private readonly checkInterval: number;

  constructor(private readonly configService: ConfigService) {
    this.memoryWarningThreshold = parseInt(
      this.configService.get('MEMORY_WARNING_THRESHOLD', '100'),
      10
    );
    this.memoryCriticalThreshold = parseInt(
      this.configService.get('MEMORY_CRITICAL_THRESHOLD', '200'),
      10
    );
    this.checkInterval = parseInt(
      this.configService.get('MEMORY_CHECK_INTERVAL', '30000'),
      10
    );
  }

  /**
   * 모듈 초기화 시 메모리 모니터링 시작
   */
  onModuleInit(): void {
    this.startMonitoring();
  }

  /**
   * 모듈 종료 시 메모리 모니터링 중지
   */
  onModuleDestroy(): void {
    this.stopMonitoring();
  }

  /**
   * 메모리 모니터링 시작
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.logger.warn('메모리 모니터링이 이미 실행 중입니다.');
      return;
    }

    this.logger.log(
      `🔍 메모리 모니터링 시작 - 간격: ${this.checkInterval/1000}초, ` +
      `경고: ${this.memoryWarningThreshold}MB, 위험: ${this.memoryCriticalThreshold}MB`
    );
    
    // 주기적으로 메모리 체크
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);

    // 초기 체크 실행
    this.checkMemoryUsage();
  }

  /**
   * 메모리 모니터링 중지
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.log('⏹️ 메모리 모니터링 중지');
    }
  }

  /**
   * 메모리 사용량 체크 및 임계치 검사
   */
  private checkMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const externalMB = Math.round(memoryUsage.external / 1024 / 1024);
    
    // 🚨 위험 임계치 초과 - 자동 가비지 컬렉션 실행
    if (heapUsedMB > this.memoryCriticalThreshold) {
      this.logger.error(
        `🚨 CRITICAL: 메모리 위험 수준 도달! ` +
        `Heap: ${heapUsedMB}MB/${heapTotalMB}MB, RSS: ${rssMB}MB, External: ${externalMB}MB`
      );
      
      this.executeGarbageCollection();
    } 
    // ⚠️ 경고 임계치 초과
    else if (heapUsedMB > this.memoryWarningThreshold) {
      this.logger.warn(
        `⚠️ WARNING: 메모리 경고 수준입니다. ` +
        `Heap: ${heapUsedMB}MB/${heapTotalMB}MB, RSS: ${rssMB}MB, External: ${externalMB}MB`
      );
    }

    // 📊 디버그 로깅 (환경변수로 제어)
    if (this.configService.get('LOG_MEMORY') === 'true') {
      this.logger.debug(
        `💾 메모리 현황: Heap ${heapUsedMB}MB/${heapTotalMB}MB, ` +
        `RSS ${rssMB}MB, External ${externalMB}MB`
      );
    }
  }

  /**
   * 가비지 컬렉션 강제 실행
   */
  private executeGarbageCollection(): void {
    if (global.gc) {
      const beforeGC = process.memoryUsage().heapUsed;
      
      this.logger.log('🗑️ 가비지 컬렉션 실행 중...');
      global.gc();
      
      const afterGC = process.memoryUsage().heapUsed;
      const freedMB = Math.round((beforeGC - afterGC) / 1024 / 1024);
      
      this.logger.log(
        `🧹 가비지 컬렉션 완료: ${freedMB}MB 해제됨 ` +
        `(${Math.round(beforeGC / 1024 / 1024)}MB → ${Math.round(afterGC / 1024 / 1024)}MB)`
      );
    } else {
      this.logger.warn(
        '⚠️ 가비지 컬렉션을 사용할 수 없습니다. ' +
        'Node.js를 --expose-gc 플래그로 시작하세요.'
      );
    }
  }

  /**
   * 현재 메모리 상태 반환
   */
  getCurrentMemoryStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    usage: ReturnType<typeof process.memoryUsage>;
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
    thresholds: {
      warning: number;
      critical: number;
    };
    uptime: number;
    timestamp: string;
  } {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const externalMB = Math.round(memoryUsage.external / 1024 / 1024);

    // 상태 판정
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (heapUsedMB > this.memoryCriticalThreshold) {
      status = 'critical';
    } else if (heapUsedMB > this.memoryWarningThreshold) {
      status = 'warning';
    }

    return {
      status,
      usage: memoryUsage,
      heapUsedMB,
      heapTotalMB,
      rssMB,
      externalMB,
      thresholds: {
        warning: this.memoryWarningThreshold,
        critical: this.memoryCriticalThreshold,
      },
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 메모리 사용량 트렌드 분석
   */
  getMemoryTrend(): {
    current: {
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
    };
    recommendation: string;
    healthScore: number;
  } {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

    // 메모리 사용률 기반 건강 점수 계산
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
    let healthScore = 100;
    
    if (heapUsedMB > this.memoryCriticalThreshold) {
      healthScore = Math.max(0, 100 - (heapUsagePercent - 70) * 2);
    } else if (heapUsedMB > this.memoryWarningThreshold) {
      healthScore = Math.max(50, 100 - heapUsagePercent);
    } else {
      healthScore = Math.max(80, 100 - heapUsagePercent * 0.5);
    }

    // 권장사항 생성
    let recommendation = '';
    if (heapUsedMB > this.memoryCriticalThreshold) {
      recommendation = '즉시 메모리 최적화 필요. 불필요한 객체 해제 검토 권장.';
    } else if (heapUsedMB > this.memoryWarningThreshold) {
      recommendation = '메모리 사용량 모니터링 강화 권장.';
    } else {
      recommendation = '메모리 상태 양호.';
    }

    return {
      current: {
        heapUsedMB,
        heapTotalMB,
        rssMB,
      },
      recommendation,
      healthScore: Math.round(healthScore),
    };
  }
}
