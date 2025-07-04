import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * 🙋‍♂️ 현재 사용자 정보 추출 데코레이터
 * 
 * JWT 인증된 사용자의 정보를 컨트롤러 메서드에서 쉽게 사용할 수 있도록 합니다.
 * 
 * 사용 예시:
 * - @CurrentUser() user: User - 전체 사용자 객체
 * - @CurrentUser('userId') userId: string - 사용자 ID만
 * - @CurrentUser('email') email: string - 이메일만
 * 
 * 주의: 이 데코레이터는 @UseGuards(JwtAuthGuard)와 함께 사용해야 합니다.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 사용자 정보가 없으면 에러 (인증 가드가 제대로 동작하지 않은 경우)
    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: '인증된 사용자 정보를 찾을 수 없습니다. JWT 인증 가드가 설정되어 있는지 확인하세요.',
        hint: 'UseGuards(JwtAuthGuard)를 추가하세요'
      });
    }

    // 특정 필드를 요청한 경우
    if (data) {
      const value = user[data];
      
      // 요청한 필드가 없거나 undefined인 경우 경고
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

    // 전체 사용자 객체 반환
    return user;
  },
);
