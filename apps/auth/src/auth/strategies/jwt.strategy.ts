import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload, JwtUser } from '@packages/common';
import { RedisService } from '@packages/database';

/**
 * 🔑 향상된 JWT 인증 전략
 * 
 * 주요 기능:
 * - JWT 토큰 검증 및 사용자 인증
 * - 토큰 블랙리스트 확인
 * - 사용자 계정 상태 검증
 * - 보안 로깅 및 모니터링
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    const secret = configService.get<string>('jwt.accessToken.secret') || 
                   process.env.JWT_ACCESS_SECRET || 
                   'default-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });

    this.logger.log(`🔗 JWT Strategy 초기화 완료 - Secret: ${secret.substring(0, 8)}...`);
  }

  /**
   * JWT 토큰 검증 및 사용자 인증
   * @param req HTTP 요청 객체
   * @param payload JWT 페이로드
   * @returns 인증된 사용자 정보
   */
  async validate(req: any, payload: JwtPayload): Promise<JwtUser> {
    try {
      const startTime = Date.now();
      
      // 개발환경에서 디버깅 로그
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`JWT 검증 시작 - 사용자 ID: ${payload.sub}`);
        this.logger.debug(`페이로드: ${JSON.stringify(payload)}`);
      }
      
      // 토큰 블랙리스트 확인
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (token && await this.redisService.isBlacklisted(token)) {
        this.logger.warn(`블랙리스트된 토큰 사용 시도 - 사용자: ${payload.sub}`);
        throw new UnauthorizedException('토큰이 무효화되었습니다');
      }

      // 사용자 조회 (성능 최적화를 위해 필요한 필드만 선택)
      const user = await this.usersService.findById(payload.sub, {
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          isActive: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        this.logger.warn(`사용자를 찾을 수 없음 - ID: ${payload.sub}`);
        throw new UnauthorizedException('사용자를 찾을 수 없습니다');
      }

      if (!user.isActive) {
        this.logger.warn(`비활성화된 계정 접근 시도 - 사용자: ${user.email}`);
        throw new UnauthorizedException('비활성화된 계정입니다');
      }

      const validationTime = Date.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`인증 성공 - 사용자: ${user.email}, 소요시간: ${validationTime}ms`);
      }

      // 인증된 사용자 정보 반환 (request.user에 설정됨)
      const jwtUser: JwtUser = {
        userId: user.id, // Guard에서 사용하는 필드명 통일
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
      };

      return jwtUser;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : '토큰 검증에 실패했습니다';
      this.logger.error(`JWT 검증 실패 - 사용자: ${payload?.sub || '알수없음'}:`, error);
      
      throw new UnauthorizedException(errorMessage);
    }
  }
}
