import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@packages/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

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
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    // 디버깅을 위한 로깅 (개발환경에서만)
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`인증 요청: ${request.method} ${request.url}`);
      this.logger.debug(`Authorization 헤더: ${authHeader ? '존재' : '없음'}`);
      this.logger.debug(`토큰: ${token ? '존재' : '없음'}`);
      this.logger.debug(`에러: ${err ? err.message : '없음'}`);
      this.logger.debug(`사용자: ${user ? '인증됨' : '인증 실패'}`);
      this.logger.debug(`정보: ${info ? JSON.stringify(info) : '없음'}`);
    }

    // 에러가 있거나 사용자가 없으면 예외 발생
    if (err || !user) {
      // Authorization 헤더가 아예 없는 경우
      if (!authHeader) {
        throw new UnauthorizedException({
          message: '인증이 필요합니다',
          error: 'Unauthorized',
          statusCode: 401,
          details: 'Authorization 헤더가 필요합니다. "Bearer <token>" 형식으로 전송해주세요.',
        });
      }

      // Bearer 토큰 형식이 잘못된 경우
      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException({
          message: '잘못된 인증 형식입니다',
          error: 'Unauthorized',
          statusCode: 401,
          details: 'Authorization 헤더는 "Bearer <token>" 형식이어야 합니다.',
        });
      }

      // 토큰이 없는 경우
      if (!token) {
        throw new UnauthorizedException({
          message: '액세스 토큰이 필요합니다',
          error: 'Unauthorized',
          statusCode: 401,
          details: '유효한 JWT 토큰을 제공해주세요.',
        });
      }

      // JWT 관련 에러 처리
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: '액세스 토큰이 만료되었습니다',
          error: 'Token Expired',
          statusCode: 401,
          details: '새로운 토큰을 발급받기 위해 /auth/refresh 엔드포인트를 사용해주세요.',
        });
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException({
          message: '유효하지 않은 토큰입니다',
          error: 'Invalid Token',
          statusCode: 401,
          details: '토큰 형식이 올바르지 않거나 서명이 유효하지 않습니다.',
        });
      }

      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException({
          message: '토큰이 아직 유효하지 않습니다',
          error: 'Token Not Active',
          statusCode: 401,
          details: '토큰의 유효 시작 시간이 아직 도래하지 않았습니다.',
        });
      }

      // 기타 인증 에러
      if (err) {
        this.logger.error(`인증 에러: ${err.message}`, err.stack);
        throw new UnauthorizedException({
          message: '인증에 실패했습니다',
          error: 'Authentication Failed',
          statusCode: 401,
          details: process.env.NODE_ENV === 'development' ? err.message : '인증 과정에서 문제가 발생했습니다.',
        });
      }

      // 사용자 정보가 없는 경우
      throw new UnauthorizedException({
        message: '사용자 인증에 실패했습니다',
        error: 'User Not Found',
        statusCode: 401,
        details: '토큰은 유효하지만 해당하는 사용자를 찾을 수 없습니다.',
      });
    }

    // 인증 성공
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`인증 성공: 사용자 ${user.userId || user.id}`);
    }

    return user;
  }
}
