import { Module } from '@nestjs/common';
import { UserCourseProgressController } from './user-course-progress.controller';
import { UserCourseProgressService } from './user-course-progress.service';
import { PrismaModule } from '@packages/database';
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';

/**
 * 📈 사용자 강의 진도 관리 모듈
 * 
 * 기능:
 * - 사용자별 등록 강의 목록 조회
 * - 강의별 학습 진도 조회 및 업데이트
 * - 진도율 자동 계산
 * - Zod 기반 데이터 검증
 * - JWT 인증 보호
 */
@Module({
  imports: [PrismaModule],
  controllers: [UserCourseProgressController],
  providers: [
    UserCourseProgressService,
    ApiJwtAuthGuard, // 로컬 JWT 가드 제공
  ],
  exports: [UserCourseProgressService],
})
export class UserCourseProgressModule {}
