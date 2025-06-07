import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

/**
 * Redis 전역 모듈
 * - 전역 모듈로 설정하여 애플리케이션 전체에서 사용 가능
 * - JWT 토큰 블랙리스트, 리프레시 토큰 관리, 로그인 시도 횟수 관리 등을 담당
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
