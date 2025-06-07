import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PrismaModule } from '@packages/database';

/**
 * 📚 강의 관리 모듈
 * 
 * 기능:
 * - 강의 CRUD (생성, 조회, 수정, 삭제)
 * - 강의 목록 조회 (카테고리별 필터링)
 * - 비디오 업로드 URL 생성 (S3)
 * - Zod 기반 데이터 검증
 */
@Module({
  imports: [PrismaModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
