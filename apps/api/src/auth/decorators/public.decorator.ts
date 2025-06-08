import { SetMetadata } from '@nestjs/common';

/**
 * 공개 엔드포인트 데코레이터
 * 
 * 이 데코레이터가 적용된 엔드포인트는 JWT 인증을 건너뜁니다.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
