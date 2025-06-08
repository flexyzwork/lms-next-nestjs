import { Module } from '@nestjs/common';
import { IdDebugController } from './id-debug.controller';

/**
 * 🔧 디버깅 모듈 (개발 환경 전용)
 * 
 * ID 생성 및 검증 디버깅을 위한 모듈입니다.
 * 프로덕션 환경에서는 이 모듈을 제거해야 합니다.
 */
@Module({
  controllers: [IdDebugController],
})
export class DebugModule {}
