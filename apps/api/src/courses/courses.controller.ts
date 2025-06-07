import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CoursesService } from './courses.service';
import {
  Public,
  JwtAuthGuard,
  CurrentUser,
  ZodValidationPipe,
} from '@packages/common';

import {
  CreateCourseSchema,
  UpdateCourseSchema,
  UploadVideoUrlSchema,
  CourseQuerySchema,
} from './dto/course.dto';
import type {
  CreateCourseDto,
  UpdateCourseDto,
  UploadVideoUrlDto,
  CourseQueryDto,
} from './dto/course.dto';

import type { User } from '@packages/common';

/**
 * 📚 강의 관리 컨트롤러
 *
 * 엔드포인트:
 * - GET /courses - 강의 목록 조회 (공개)
 * - POST /courses - 강의 생성 (인증 필요)
 * - GET /courses/:courseId - 특정 강의 조회 (공개)
 * - PUT /courses/:courseId - 강의 수정 (인증 필요)
 * - DELETE /courses/:courseId - 강의 삭제 (인증 필요)
 * - POST /courses/:courseId/sections/:sectionId/chapters/:chapterId/get-upload-url - 비디오 업로드 URL (인증 필요)
 */
@ApiTags('강의 관리')
@Controller('courses')
// @UseGuards(JwtAuthGuard) // 임시 비활성화
export class CoursesController {
  private readonly logger = new Logger(CoursesController.name);

  constructor(private readonly coursesService: CoursesService) {}

  /**
   * 📋 강의 목록 조회 (공개 접근)
   * 카테고리별 필터링 지원
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: '강의 목록 조회',
    description:
      '등록된 모든 강의를 조회합니다. 카테고리별 필터링이 가능합니다.',
  })
  @ApiResponse({ status: 200, description: '강의 목록 조회 성공' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 분당 20회 제한
  async listCourses(
    @Query(new ZodValidationPipe(CourseQuerySchema)) query: CourseQueryDto
  ) {
    this.logger.log(
      `강의 목록 조회 요청 - 카테고리: ${query.category || '전체'}`
    );

    const result = await this.coursesService.findAllCourses(query.category);

    this.logger.log(`강의 목록 조회 완료 - ${result.data.length}개 강의 반환`);
    return result;
  }

  /**
   * 📝 새 강의 생성 (인증 필요)
   */
  @Post()
  @ApiOperation({
    summary: '강의 생성',
    description: '새로운 강의를 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '강의 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async createCourse(
    @Body(new ZodValidationPipe(CreateCourseSchema))
    createCourseDto: CreateCourseDto
    // @CurrentUser() user: User, // 임시 비활성화
  ) {
    this.logger.log(
      `강의 생성 요청 - 교사: ${createCourseDto.teacherName} (${createCourseDto.teacherId})`
    );

    const result = await this.coursesService.createCourse(createCourseDto);

    this.logger.log(`강의 생성 완료 - ID: ${result.data.courseId}`);
    return result;
  }

  /**
   * 🔍 특정 강의 조회 (공개 접근)
   */
  @Public()
  @Get(':courseId')
  @ApiOperation({
    summary: '강의 상세 조회',
    description: '특정 강의의 상세 정보를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '강의 조회 성공' })
  @ApiResponse({ status: 404, description: '강의를 찾을 수 없음' })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 분당 30회 제한
  async getCourse(@Param('courseId') courseId: string) {
    this.logger.log(`강의 상세 조회 요청 - ID: ${courseId}`);

    const result = await this.coursesService.findCourseById(courseId);

    if (result.data) {
      this.logger.log(`강의 조회 완료 - 제목: ${result.data.title}`);
    }

    return result;
  }

  /**
   * ✏️ 강의 수정 (인증 필요, 파일 업로드 지원)
   */
  @Put(':courseId')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: '강의 수정',
    description: '기존 강의의 정보를 수정합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '강의 수정 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '수정 권한 없음' })
  @ApiResponse({ status: 404, description: '강의를 찾을 수 없음' })
  @ApiBearerAuth()
  async updateCourse(
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(UpdateCourseSchema))
    updateCourseDto: UpdateCourseDto,
    @UploadedFile() file: Express.Multer.File | undefined
    // @CurrentUser() user: User, // 임시 비활성화
  ) {
    // 임시로 더미 사용자 ID 사용
    const userId = 'temp-user-id';
    this.logger.log(`강의 수정 요청 - ID: ${courseId}, 사용자: ${userId}`);

    const result = await this.coursesService.updateCourse(
      courseId,
      updateCourseDto,
      userId,
      file
    );

    this.logger.log(`강의 수정 완료 - ID: ${courseId}`);
    return result;
  }

  /**
   * 🗑️ 강의 삭제 (인증 필요)
   */
  @Delete(':courseId')
  @ApiOperation({
    summary: '강의 삭제',
    description: '기존 강의를 삭제합니다.',
  })
  @ApiResponse({ status: 200, description: '강의 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '삭제 권한 없음' })
  @ApiResponse({ status: 404, description: '강의를 찾을 수 없음' })
  @ApiBearerAuth()
  async deleteCourse(
    @Param('courseId') courseId: string
    // @CurrentUser() user: User, // 임시 비활성화
  ) {
    // 임시로 더미 사용자 ID 사용
    const userId = 'temp-user-id';
    this.logger.log(`강의 삭제 요청 - ID: ${courseId}, 사용자: ${userId}`);

    const result = await this.coursesService.deleteCourse(courseId, userId);

    this.logger.log(`강의 삭제 완료 - ID: ${courseId}`);
    return result;
  }

  /**
   * 📹 비디오 업로드 URL 생성 (인증 필요)
   */
  @Post(':courseId/sections/:sectionId/chapters/:chapterId/get-upload-url')
  @ApiOperation({
    summary: '비디오 업로드 URL 생성',
    description: 'S3에 비디오를 업로드하기 위한 미리 서명된 URL을 생성합니다.',
  })
  @ApiResponse({ status: 200, description: 'URL 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiBearerAuth()
  async getUploadVideoUrl(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Param('chapterId') chapterId: string,
    @Body(new ZodValidationPipe(UploadVideoUrlSchema))
    uploadVideoUrlDto: UploadVideoUrlDto
    // @CurrentUser() user: User, // 임시 비활성화
  ) {
    this.logger.log(
      `비디오 업로드 URL 요청 - 강의: ${courseId}, 챕터: ${chapterId}, 파일: ${uploadVideoUrlDto.fileName}`
    );

    const result =
      await this.coursesService.generateUploadVideoUrl(uploadVideoUrlDto);

    this.logger.log(`비디오 업로드 URL 생성 완료`);
    return result;
  }
}
