import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 🔒 API 서비스용 JWT 인증 가드
 * 
 * @packages/common의 JwtAuthGuard와 동일한 기능을 제공하지만
 * 의존성 주입 문제를 방지하기 위해 로컬에서 정의
 */
@Injectable()
export class ApiJwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(ApiJwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
    
    // Reflector 의존성 주입 확인
    if (!this.reflector) {
      this.logger.error('❌ Reflector 의존성 주입 실패!');
      throw new Error('Reflector가 주입되지 않았습니다. 모듈 설정을 확인해주세요.');
    }
    
    this.logger.log('✅ API JWT 인증 가드 초기화 완료');
  }

  /**
   * 인증 필요 여부 확인
   * @Public() 데코레이터가 있으면 인증을 건너뜁니다
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // @Public() 데코레이터 확인
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) {
        this.logger.debug('🌐 공개 엔드포인트 접근 - 인증 건너뛰기');
        return true;
      }

      // 부모 클래스의 canActivate 호출
      const result = super.canActivate(context);
      
      // Promise인 경우 await 처리
      if (result instanceof Promise) {
        return await result;
      }
      
      return result as boolean;
    } catch (error) {
      this.logger.error('canActivate 실행 중 오류:', error);
      return false;
    }
  }

  /**
   * 인증 결과 처리
   * 토큰 만료 시 클라이언트에게 갱신 안내 헤더 추가
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest();
      const response = context.switchToHttp().getResponse();
      const token = this.extractTokenFromRequest(request);
      const userAgent = request.get('User-Agent') || '알 수 없음';
      const clientIp = this.getClientIp(request);

      // 에러가 있거나 사용자가 없으면 예외 발생
      if (err || !user) {
        if (!token) {
          this.logger.warn(`🚫 토큰 없음 - IP: ${clientIp}, UA: ${userAgent}`);
          throw new UnauthorizedException({
            code: 'NO_TOKEN',
            message: '액세스 토큰이 필요합니다',
            action: 'LOGIN_REQUIRED'
          });
        }

        // 토큰 만료 처리
        if (info?.name === 'TokenExpiredError') {
          this.logger.warn(`⏰ 토큰 만료 - IP: ${clientIp}, UA: ${userAgent}`);
          
          // 클라이언트에게 토큰 갱신 필요 알림
          this.setTokenExpiredHeaders(response);
          
          throw new UnauthorizedException({
            code: 'TOKEN_EXPIRED',
            message: '액세스 토큰이 만료되었습니다',
            action: 'REFRESH_TOKEN',
            refreshEndpoint: '/api/auth/refresh'
          });
        }

        // 유효하지 않은 토큰 처리
        if (info?.name === 'JsonWebTokenError') {
          this.logger.warn(`🔒 유효하지 않은 토큰 - IP: ${clientIp}, UA: ${userAgent}`);
          throw new UnauthorizedException({
            code: 'INVALID_TOKEN',
            message: '유효하지 않은 토큰입니다',
            action: 'LOGIN_REQUIRED'
          });
        }

        // 토큰이 아직 활성화되지 않음
        if (info?.name === 'NotBeforeError') {
          this.logger.warn(`⏳ 토큰이 아직 활성화되지 않음 - IP: ${clientIp}`);
          throw new UnauthorizedException({
            code: 'TOKEN_NOT_ACTIVE',
            message: '토큰이 아직 활성화되지 않았습니다',
            action: 'LOGIN_REQUIRED'
          });
        }

        // 기타 인증 오류
        this.logger.error(`❌ 인증 실패 - IP: ${clientIp}, 에러:`, err);
        throw err || new UnauthorizedException({
          code: 'AUTH_FAILED',
          message: '인증에 실패했습니다',
          action: 'LOGIN_REQUIRED'
        });
      }

      // 성공적인 인증 로그
      this.logger.debug(`✅ 인증 성공 - 사용자: ${user.id || user.email}, IP: ${clientIp}`);
      
      // 토큰 갱신 권장 시점 확인
      this.checkTokenRefreshRecommendation(token, response);

      return user;
    } catch (error) {
      this.logger.error('handleRequest 실행 중 오류:', error);
      throw error instanceof UnauthorizedException 
        ? error 
        : new UnauthorizedException('인증 처리 중 오류가 발생했습니다');
    }
  }

  /**
   * 요청에서 JWT 토큰 추출
   */
  private extractTokenFromRequest(request: any): string | null {
    const authHeader = request.headers?.authorization;
    
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * 클라이언트 IP 주소 추출
   */
  private getClientIp(request: any): string {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const realIp = request.headers?.['x-real-ip'];
    
    return (
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]) ||
      realIp ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      '알 수 없음'
    );
  }

  /**
   * 토큰 만료 헤더 설정
   */
  private setTokenExpiredHeaders(response: any): void {
    try {
      response.setHeader('X-Token-Expired', 'true');
      response.setHeader('X-Refresh-Required', 'true');
      response.setHeader('X-Token-Expires-In', '0');
      
      // CORS 헤더 설정
      const existingHeaders = response.getHeader('Access-Control-Expose-Headers') || '';
      const newHeaders = 'X-Token-Expired, X-Refresh-Required, X-Token-Expires-In';
      const combinedHeaders = existingHeaders 
        ? `${existingHeaders}, ${newHeaders}`
        : newHeaders;
        
      response.setHeader('Access-Control-Expose-Headers', combinedHeaders);
    } catch (error) {
      this.logger.warn('토큰 만료 헤더 설정 실패:', error);
    }
  }

  /**
   * 토큰 갱신 권장 시점 확인
   */
  private checkTokenRefreshRecommendation(token: string | null, response: any): void {
    if (!token) return;

    try {
      // JWT 페이로드 디코딩
      const parts = token.split('.');
      if (parts.length !== 3) return;

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp;
      
      if (!exp || typeof exp !== 'number') return;

      const timeUntilExpiry = exp - now;
      
      // 30분(1800초) 미만 남았으면 갱신 권장
      if (timeUntilExpiry > 0 && timeUntilExpiry < 1800) {
        response.setHeader('X-Token-Refresh-Recommended', 'true');
        response.setHeader('X-Token-Expires-In', timeUntilExpiry.toString());
        
        // 5분 미만이면 높은 우선순위
        if (timeUntilExpiry < 300) {
          response.setHeader('X-Refresh-Priority', 'high');
        } else {
          response.setHeader('X-Refresh-Priority', 'normal');
        }
        
        this.logger.debug(`💡 토큰 갱신 권장 - 만료까지 ${timeUntilExpiry}초 남음`);
        
        // CORS 헤더 업데이트
        const existingHeaders = response.getHeader('Access-Control-Expose-Headers') || '';
        const newHeaders = 'X-Token-Refresh-Recommended, X-Token-Expires-In, X-Refresh-Priority';
        const combinedHeaders = existingHeaders 
          ? `${existingHeaders}, ${newHeaders}`
          : newHeaders;
          
        response.setHeader('Access-Control-Expose-Headers', combinedHeaders);
      }
    } catch (error) {
      this.logger.debug('토큰 만료 시간 확인 실패:', error);
    }
  }
}
