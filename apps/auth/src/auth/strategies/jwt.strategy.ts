import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/auth.interface';
import { RedisService } from '@packages/database';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    const secret = configService.get<string>('jwt.accessToken.secret') || process.env.JWT_ACCESS_SECRET || 'default-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    try {
      // 토큰이 블랙리스트에 있는지 확인
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (token && await this.redisService.isBlacklisted(token)) {
        throw new UnauthorizedException('토큰이 무효화되었습니다');
      }

      // 사용자 조회
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('비활성화된 계정입니다');
      }

      // 사용자 정보를 request.user에 추가
      return {
        userId: user.id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '토큰 검증에 실패했습니다';
      throw new UnauthorizedException(errorMessage);
    }
  }
}
