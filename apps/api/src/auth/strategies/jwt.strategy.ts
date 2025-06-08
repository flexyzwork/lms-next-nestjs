import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@packages/common';

/**
 * 🔐 JWT 인증 전략
 * 
 * JWT 토큰을 검증하고 사용자 정보를 반환합니다.
 * API 서비스에서는 토큰 검증만 수행하고, 사용자 데이터는 토큰 페이로드에서 가져옵니다.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const jwtSecret = configService.get<string>('jwt.secret');
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      // 추가 보안 옵션
      passReqToCallback: false,
    });

    this.logger.log('🔑 JWT 전략 초기화 완료');
  }

  /**
   * JWT 페이로드 검증 및 사용자 정보 반환
   * 
   * @param payload JWT 페이로드
   * @returns 검증된 사용자 정보
   */
  async validate(payload: JwtPayload) {
    try {
      this.logger.debug('JWT 페이로드 검증 시작:', { 
        sub: payload.sub,
        email: payload.email,
        exp: payload.exp,
        iat: payload.iat 
      });

      // 페이로드 기본 구조 검증
      if (!payload || typeof payload !== 'object') {
        this.logger.warn('유효하지 않은 토큰 구조');
        throw new UnauthorizedException('유효하지 않은 토큰 구조입니다');
      }

      const { sub: userId, email, username, role } = payload;

      // 필수 필드 검증
      if (!userId) {
        this.logger.warn('토큰에 사용자 ID 없음');
        throw new UnauthorizedException('토큰에 사용자 ID가 없습니다');
      }

      if (!email) {
        this.logger.warn('토큰에 이메일 없음');
        throw new UnauthorizedException('토큰에 이메일 정보가 없습니다');
      }

      // 토큰 시간 검증 (추가 보안)
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp <= now) {
        this.logger.warn('토큰 만료됨:', { exp: payload.exp, now });
        throw new UnauthorizedException('토큰이 만료되었습니다');
      }

      // 토큰 발급 시간 확인 (미래 토큰 방지)
      if (payload.iat && payload.iat > now + 60) { // 1분 여유
        this.logger.warn('유효하지 않은 토큰 발급 시간:', { iat: payload.iat, now });
        throw new UnauthorizedException('유효하지 않은 토큰 발급 시간입니다');
      }

      // 사용자 객체 구성 (JwtUser 인터페이스와 호환)
      const user = {
        id: userId,
        email,
        username: username || email.split('@')[0], // username이 없으면 이메일에서 생성
        role: role || 'user', // 기본값은 user (student -> user로 변경)
        
        // 추가 메타데이터
        tokenIssuedAt: payload.iat,
        tokenExpiresAt: payload.exp,
        
        // 기본값 설정
        isVerified: true, // API에서는 검증된 토큰만 받으므로 true
        isActive: true,   // API에서는 활성 사용자만 접근 가능하므로 true
      };

      this.logger.debug(`✅ JWT 토큰 검증 성공 - 사용자: ${userId} (${email})`);
      
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error('JWT 토큰 검증 중 예외 발생:', error);
      throw new UnauthorizedException('토큰 검증 중 오류가 발생했습니다');
    }
  }
}
