import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';

/**
 * 🔄 토큰 자동 갱신 인터셉터
 * 
 * JWT 토큰의 만료 시간을 분석하여 클라이언트에게 적절한 헤더 정보를 제공합니다.
 * 클라이언트는 이 헤더 정보를 기반으로 토큰을 자동으로 갱신할 수 있습니다.
 */

/** 토큰 헤더 설정 옵션 */
export interface TokenHeaderOptions {
  /** 갱신 권장 임계값 (분) */
  refreshThresholdMinutes?: number;
  /** 만료 경고 임계값 (분) */
  expiryWarningMinutes?: number;
  /** 디버그 로깅 활성화 */
  enableDebugLogging?: boolean;
}

/** 기본 옵션 타입 */
interface DefaultTokenHeaderOptions {
  refreshThresholdMinutes: number;
  expiryWarningMinutes: number;
  enableDebugLogging: boolean;
}

@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  public readonly logger = new Logger(TokenRefreshInterceptor.name);
  
  public readonly defaultOptions: DefaultTokenHeaderOptions = {
    refreshThresholdMinutes: 5, // 5분 전부터 갱신 권장
    expiryWarningMinutes: 10,   // 10분 전부터 만료 경고
    enableDebugLogging: process.env.NODE_ENV === 'development',
  };

  constructor(
    public readonly jwtService: JwtService,
    public readonly options: TokenHeaderOptions = {}
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    return next.handle().pipe(
      tap(() => {
        this.setTokenHeaders(request, response);
      })
    );
  }

  /**
   * 토큰 관련 헤더 설정
   */
  public setTokenHeaders(request: Request, response: Response): void {
    try {
      const token = this.extractTokenFromRequest(request);
      if (!token) {
        return; // 토큰이 없으면 헤더 설정하지 않음
      }

      const tokenPayload = this.validateAndDecodeToken(token);
      if (!tokenPayload) {
        this.setExpiredTokenHeaders(response);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = tokenPayload.exp;
      
      if (!expiresAt) {
        this.logger.warn('토큰에 만료 시간(exp)이 없습니다');
        return;
      }

      const timeUntilExpiry = expiresAt - now;
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);
      
      // 토큰이 이미 만료된 경우
      if (timeUntilExpiry <= 0) {
        this.setExpiredTokenHeaders(response);
        return;
      }

      // 토큰 상태에 따른 헤더 설정
      this.setTokenStatusHeaders(response, timeUntilExpiry, minutesUntilExpiry);
      
      // CORS 헤더 설정 (클라이언트에서 커스텀 헤더 읽기 가능하도록)
      this.setCorsHeaders(response);
      
    } catch (error: unknown) {
      this.logger.error('토큰 헤더 설정 중 오류 발생:', error);
      // 오류 발생 시에도 기본 CORS 헤더는 설정
      this.setCorsHeaders(response);
    }
  }

  /**
   * 요청에서 JWT 토큰 추출
   */
  public extractTokenFromRequest(request: Request): string | null {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Bearer 토큰 형식 확인
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * 토큰 검증 및 디코딩
   */
  public validateAndDecodeToken(token: string): any | null {
    try {
      // JWT 검증 없이 디코딩만 수행 (만료 시간 확인용)
      const decoded = this.jwtService.decode(token);
      
      if (!decoded || typeof decoded === 'string') {
        return null;
      }

      return decoded;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.debug('토큰 디코딩 실패:', errorMessage);
      return null;
    }
  }

  /**
   * 만료된 토큰에 대한 헤더 설정
   */
  public setExpiredTokenHeaders(response: Response): void {
    response.setHeader('X-Token-Expired', 'true');
    response.setHeader('X-Refresh-Required', 'true');
    response.setHeader('X-Token-Expires-In', '0');
    
    if (this.getDebugLoggingOption()) {
      this.logger.warn('만료된 토큰 감지 - 리프레시 필요');
    }
  }

  /**
   * 토큰 상태에 따른 헤더 설정
   */
  public setTokenStatusHeaders(
    response: Response, 
    timeUntilExpiry: number, 
    minutesUntilExpiry: number
  ): void {
    const refreshThreshold = this.getRefreshThresholdOption();
    const expiryWarning = this.getExpiryWarningOption();
    
    // 만료까지 남은 시간 설정 (초 단위)
    response.setHeader('X-Token-Expires-In', timeUntilExpiry.toString());
    
    // 갱신 권장 헤더 설정
    if (minutesUntilExpiry <= refreshThreshold) {
      response.setHeader('X-Token-Refresh-Recommended', 'true');
      response.setHeader('X-Refresh-Priority', 'high');
      
      if (this.getDebugLoggingOption()) {
        this.logger.debug(`토큰 갱신 권장 - ${minutesUntilExpiry}분 후 만료`);
      }
    } else if (minutesUntilExpiry <= expiryWarning) {
      response.setHeader('X-Token-Refresh-Recommended', 'true');
      response.setHeader('X-Refresh-Priority', 'normal');
      
      if (this.getDebugLoggingOption()) {
        this.logger.debug(`토큰 만료 경고 - ${minutesUntilExpiry}분 후 만료`);
      }
    }

    // 추가 토큰 정보 제공
    response.setHeader('X-Token-Minutes-Until-Expiry', minutesUntilExpiry.toString());
    
    // 토큰 상태 정보
    if (minutesUntilExpiry <= 1) {
      response.setHeader('X-Token-Status', 'critical');
    } else if (minutesUntilExpiry <= refreshThreshold) {
      response.setHeader('X-Token-Status', 'refresh-recommended');
    } else if (minutesUntilExpiry <= expiryWarning) {
      response.setHeader('X-Token-Status', 'warning');
    } else {
      response.setHeader('X-Token-Status', 'valid');
    }
  }

  /**
   * CORS 헤더 설정 (클라이언트에서 커스텀 헤더 접근 가능하도록)
   */
  public setCorsHeaders(response: Response): void {
    const exposedHeaders = [
      'X-Token-Refresh-Recommended',
      'X-Token-Expires-In',
      'X-Token-Expired',
      'X-Refresh-Required',
      'X-Refresh-Priority',
      'X-Token-Minutes-Until-Expiry',
      'X-Token-Status'
    ].join(', ');

    response.setHeader('Access-Control-Expose-Headers', exposedHeaders);
  }

  /**
   * 갱신 임계값 옵션 가져오기
   */
  public getRefreshThresholdOption(): number {
    return this.options.refreshThresholdMinutes ?? this.defaultOptions.refreshThresholdMinutes;
  }

  /**
   * 만료 경고 임계값 옵션 가져오기
   */
  public getExpiryWarningOption(): number {
    return this.options.expiryWarningMinutes ?? this.defaultOptions.expiryWarningMinutes;
  }

  /**
   * 디버그 로깅 옵션 가져오기
   */
  public getDebugLoggingOption(): boolean {
    return this.options.enableDebugLogging ?? this.defaultOptions.enableDebugLogging;
  }
}

/**
 * 구성된 토큰 갱신 인터셉터 클래스
 */
@Injectable()
export class ConfiguredTokenRefreshInterceptor extends TokenRefreshInterceptor {
  constructor(
    jwtService: JwtService,
    options: TokenHeaderOptions = {}
  ) {
    super(jwtService, options);
  }
}

/**
 * 토큰 갱신 인터셉터 팩토리 함수
 * 
 * @param options 토큰 헤더 설정 옵션
 * @returns 설정이 적용된 인터셉터 클래스
 */
export function createTokenRefreshInterceptor(options: TokenHeaderOptions = {}) {
  return class extends TokenRefreshInterceptor {
    constructor(jwtService: JwtService) {
      super(jwtService, options);
    }
  };
}

/**
 * 글로벌 토큰 갱신 인터셉터 설정을 위한 프로바이더
 */
export const TokenRefreshInterceptorProvider = {
  provide: 'APP_INTERCEPTOR',
  useClass: TokenRefreshInterceptor,
  inject: [JwtService],
};
