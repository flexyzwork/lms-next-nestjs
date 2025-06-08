import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * 현재 인증된 사용자 정보를 가져오는 데코레이터
 * 
 * JWT 가드에 의해 request.user에 설정된 사용자 정보를 반환합니다.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: '인증된 사용자 정보를 찾을 수 없습니다. JWT 인증 가드가 설정되어 있는지 확인하세요.',
        hint: 'UseGuards(ApiJwtAuthGuard)를 추가하세요'
      });
    }

    // 특정 필드 요청 시
    if (data) {
      const value = user[data];
      if (value === undefined) {
        throw new BadRequestException({
          code: 'USER_FIELD_NOT_FOUND',
          message: `사용자 객체에 '${data}' 필드가 없습니다`,
          availableFields: Object.keys(user),
          requestedField: data
        });
      }
      return value;
    }

    return user;
  },
);
