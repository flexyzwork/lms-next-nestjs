import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cache.decorator';

/**
 * 🚀 Redis 캐시 인터셉터
 * 
 * 기능:
 * - 메서드 호출 전 캐시 확인
 * - 캐시 미스 시 메서드 실행 후 결과 캐싱
 * - 동적 캐시 키 생성 (파라미터 치환)
 * - TTL 기반 만료 관리
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: any // Redis 서비스 주입 필요
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    const cacheTtl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());

    // 캐시 설정이 없으면 그대로 진행
    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const methodArgs = context.getArgs();
    
    // 동적 캐시 키 생성
    const dynamicCacheKey = this.buildCacheKey(cacheKey, methodArgs, request);

    this.logger.debug(`캐시 확인: ${dynamicCacheKey}`);

    // 캐시에서 데이터 조회
    return from(this.getFromCache(dynamicCacheKey)).pipe(
      switchMap((cachedResult) => {
        if (cachedResult !== null) {
          this.logger.debug(`캐시 히트: ${dynamicCacheKey}`);
          return of(cachedResult);
        }

        this.logger.debug(`캐시 미스: ${dynamicCacheKey}`);
        
        // 캐시 미스 시 실제 메서드 실행
        return next.handle().pipe(
          tap((result) => {
            // 결과를 캐시에 저장
            this.saveToCache(dynamicCacheKey, result, cacheTtl);
          })
        );
      })
    );
  }

  /**
   * 🔑 동적 캐시 키 생성
   * 
   * @param template 캐시 키 템플릿 (예: 'user-courses:{userId}')
   * @param args 메서드 인자
   * @param request HTTP 요청 객체
   * @returns 실제 캐시 키
   */
  private buildCacheKey(template: string, args: any[], request: any): string {
    let cacheKey = template;

    // URL 파라미터에서 값 추출
    const params = request.params || {};
    const query = request.query || {};
    const user = request.user || {};

    // 파라미터 치환
    cacheKey = cacheKey.replace(/\{(\w+)\}/g, (match, key) => {
      // 메서드 인자에서 찾기 (첫 번째 인자가 주로 ID)
      if (args.length > 0 && key === 'userId' && typeof args[0] === 'string') {
        return args[0];
      }
      if (args.length > 1 && key === 'courseId' && typeof args[1] === 'string') {
        return args[1];
      }
      
      // URL 파라미터에서 찾기
      if (params[key]) {
        return params[key];
      }
      
      // 쿼리 파라미터에서 찾기
      if (query[key]) {
        return query[key];
      }
      
      // 사용자 정보에서 찾기
      if (user[key]) {
        return user[key];
      }
      
      // 기본값 반환
      return key;
    });

    return cacheKey;
  }

  /**
   * 📦 캐시에서 데이터 조회
   */
  private async getFromCache(key: string): Promise<any> {
    try {
      if (!this.redisService) {
        return null;
      }

      const cached = await this.redisService.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn(`캐시 조회 실패: ${key}`, error);
      return null;
    }
  }

  /**
   * 💾 캐시에 데이터 저장
   */
  private async saveToCache(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      if (!this.redisService) {
        return;
      }

      await this.redisService.setex(key, ttl, JSON.stringify(data));
      this.logger.debug(`캐시 저장: ${key} (TTL: ${ttl}초)`);
    } catch (error) {
      this.logger.warn(`캐시 저장 실패: ${key}`, error);
    }
  }
}

/**
 * 🗑️ 캐시 무효화 인터셉터
 */
@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheEvictInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: any
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const evictKeys = this.reflector.get<string[]>('cache:evict', context.getHandler());

    if (!evictKeys || evictKeys.length === 0) {
      return next.handle();
    }

    // 메서드 실행 후 캐시 무효화
    return next.handle().pipe(
      tap(() => {
        this.evictCache(evictKeys, context);
      })
    );
  }

  /**
   * 🗑️ 캐시 무효화 실행
   */
  private async evictCache(keyPatterns: string[], context: ExecutionContext): Promise<void> {
    try {
      if (!this.redisService) {
        return;
      }

      const request = context.switchToHttp().getRequest();
      const methodArgs = context.getArgs();

      for (const pattern of keyPatterns) {
        // 동적 키 생성 (CacheInterceptor와 동일한 로직)
        const cacheKey = this.buildCacheKey(pattern, methodArgs, request);
        
        // 패턴 매칭으로 여러 키 삭제
        if (cacheKey.includes('*')) {
          const keys = await this.redisService.keys(cacheKey);
          if (keys.length > 0) {
            await this.redisService.del(...keys);
            this.logger.debug(`캐시 무효화 (패턴): ${cacheKey} (${keys.length}개 키)`);
          }
        } else {
          await this.redisService.del(cacheKey);
          this.logger.debug(`캐시 무효화: ${cacheKey}`);
        }
      }
    } catch (error) {
      this.logger.warn('캐시 무효화 실패', error);
    }
  }

  /**
   * 🔑 동적 캐시 키 생성 (CacheInterceptor와 동일)
   */
  private buildCacheKey(template: string, args: any[], request: any): string {
    let cacheKey = template;

    const params = request.params || {};
    const query = request.query || {};
    const user = request.user || {};

    cacheKey = cacheKey.replace(/\{(\w+)\}/g, (match, key) => {
      if (args.length > 0 && key === 'userId' && typeof args[0] === 'string') {
        return args[0];
      }
      if (args.length > 1 && key === 'courseId' && typeof args[1] === 'string') {
        return args[1];
      }
      if (params[key]) return params[key];
      if (query[key]) return query[key];
      if (user[key]) return user[key];
      return key;
    });

    return cacheKey;
  }
}