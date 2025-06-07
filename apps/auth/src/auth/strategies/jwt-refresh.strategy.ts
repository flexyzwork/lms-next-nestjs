import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtRefreshPayload } from '../interfaces/auth.interface';
import { RedisService } from '@packages/database';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshToken.secret'),
    });
  }

  async validate(payload: JwtRefreshPayload) {
    try {
      // 리프레시 토큰이 Redis에 저장되어 있는지 확인
      const isValid = await this.redisService.isRefreshTokenValid(payload.sub, payload.tokenId);
      if (!isValid) {
        throw new UnauthorizedException('리프레시 토큰이 유효하지 않습니다');
      }

      // 사용자 조회
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('비활성화된 계정입니다');
      }

      return {
        userId: user.id,
        email: user.email,
        username: user.username,
        tokenId: payload.tokenId,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : '리프레시 토큰 검증에 실패했습니다';
      throw new UnauthorizedException(errorMessage);
    }
  }
}
