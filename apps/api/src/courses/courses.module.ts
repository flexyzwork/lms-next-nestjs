import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PrismaModule } from '@packages/database';
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';

/**
 * 📚 강의 관리 모듈
 * 
 * 기능:
 * - 강의 CRUD (생성, 조회, 수정, 삭제)
 * - 강의 목록 조회 (카테고리별 필터링)
 * - 비디오 업로드 URL 생성 (S3)
 * - Zod 기반 데이터 검증
 * - JWT 인증 보호
 */
@Module({
  imports: [PrismaModule],
  controllers: [CoursesController],
  providers: [
    CoursesService,
    ApiJwtAuthGuard, // 로컬 JWT 가드 제공
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
