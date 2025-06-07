import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';


/**
 * 🔒 JWT 인증 가드
 *
 * JWT 토큰을 검증하여 사용자 인증을 처리합니다.
 * @Public() 데코레이터가 있는 엔드포인트는 인증을 건너뜁니다.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // @Public() 데코레이터가 있는 경우 인증 건너뛰기
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // 에러가 있거나 사용자가 없으면 예외 발생
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const token = request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('액세스 토큰이 필요합니다');
      }

      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('액세스 토큰이 만료되었습니다');
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('유효하지 않은 토큰입니다');
      }

      throw err || new UnauthorizedException('인증에 실패했습니다');
    }

    return user;
  }
}
