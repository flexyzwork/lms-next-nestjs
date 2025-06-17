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
  ForbiddenException,
  BadRequestException, // 새로 추가
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
import { ZodValidationPipe, RoleUtils } from '@packages/common';

// 로컬 가드와 데코레이터 사용
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import {
  CreateCourseSchema,
  // UpdateCourseSchema, // 임시로 비활성화
  // UpdateCourseFormDataSchema, // 임시로 비활성화
  // UploadVideoUrlSchema, // 임시로 비활성화
  // CourseQuerySchema, // 임시로 비활성화
} from './dto/course.dto';
import type {
  CreateCourseDto,
  // UpdateCourseDto, // 임시로 비활성화
  // UpdateCourseFormDataDto, // 임시로 비활성화
  // UploadVideoUrlDto, // 임시로 비활성화
  // CourseQueryDto, // 임시로 비활성화
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
@UseGuards(ApiJwtAuthGuard) // 컨트롤러 레벨에서 기본 인증 적용
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
  async listCourses(@Query() query: any) {
    // 수동으로 카테고리 값 추출 및 검증
    const category = query?.category || undefined;

    this.logger.log(`강의 목록 조회 요청 - 카테고리: ${category || '전체'}`);

    const result = await this.coursesService.findAllCourses(category);

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
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async createCourse(
    @Body(new ZodValidationPipe(CreateCourseSchema))
    createCourseDto: CreateCourseDto,
    @CurrentUser() user: User
  ) {
    this.logger.log(
      `강의 생성 요청 - 교사: ${createCourseDto.teacherName} (${createCourseDto.teacherId}), 요청자: ${user.id}, 역할: ${user.role}`
    );

    // 권한 검증: 강사 또는 관리자만 강의 생성 가능
    if (!RoleUtils.canManageCourses(user.role)) {
      this.logger.warn(
        `강의 생성 권한 없음 - 사용자: ${user.id}, 역할: ${user.role}`
      );
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message:
          '강의 생성 권한이 없습니다. 강사 또는 관리자 권한이 필요합니다.',
        allowedRoles: ['INSTRUCTOR', 'TEACHER', 'ADMIN'],
        userRole: user.role,
        isInstructor: RoleUtils.isInstructor(user.role),
        isAdmin: RoleUtils.isAdmin(user.role),
      });
    }

    const result = await this.coursesService.createCourse(
      createCourseDto,
      user.id
    );

    this.logger.log(
      `✅ 강의 생성 완료 - ID: ${result.data.courseId}, 강사: ${user.role}`
    );
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
    @Body() updateCourseDto: any, // 임시로 직접 처리
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User
  ) {
    try {
      this.logger.log(`=== 강의 수정 요청 시작 ===`);
      this.logger.log(`Course ID: ${courseId}`);
      this.logger.log(`User: ${user.id} (${user.role})`);
      this.logger.log(`Raw Body Type: ${typeof updateCourseDto}`);
      this.logger.log(
        `Raw Body Content:`,
        JSON.stringify(updateCourseDto, null, 2)
      );
      this.logger.log(
        `File Info:`,
        file
          ? {
              name: file.originalname,
              type: file.mimetype,
              size: file.size,
            }
          : 'No file'
      );

      // 데이터 안전 처리
      const safeData: any = {};

      if (updateCourseDto?.title && updateCourseDto.title.trim()) {
        safeData.title = String(updateCourseDto.title).trim();
      }

      if (updateCourseDto?.description !== undefined) {
        safeData.description = String(updateCourseDto.description || '').trim();
      }

      if (updateCourseDto?.category && updateCourseDto.category.trim()) {
        safeData.category = String(updateCourseDto.category).trim();
      }

      if (
        updateCourseDto?.price !== undefined &&
        updateCourseDto.price !== ''
      ) {
        const price = parseFloat(String(updateCourseDto.price));
        if (!isNaN(price) && price >= 0) {
          safeData.price = price;
        }
      }

      if (updateCourseDto?.level) {
        safeData.level = String(updateCourseDto.level);
      }

      if (updateCourseDto?.status) {
        safeData.status = String(updateCourseDto.status);
      }

      this.logger.log(`Processed Data:`, JSON.stringify(safeData, null, 2));
      this.logger.log(`=== Service 호출 시작 ===`);

      const result = await this.coursesService.updateCourse(
        courseId,
        safeData,
        user.id,
        file
      );

      this.logger.log(`=== 강의 수정 완료 ===`);
      return result;
    } catch (error) {
      this.logger.error(`=== Controller Error ===`);
      this.logger.error(`Course ID: ${courseId}`);
      this.logger.error(
        `Error Type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`
      );
      this.logger.error(
        `Error Message: ${error instanceof Error ? error.message : String(error)}`
      );
      if ((error as Error)?.stack) {
        this.logger.error(`Stack Trace:`);
        (error as Error)?.stack
          ?.split('\n')
          .slice(0, 8)
          .forEach((line: string, i: number) => {
            this.logger.error(`  ${i + 1}. ${line.trim()}`);
          });
      }
      throw error;
    }
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
    @Param('courseId') courseId: string,
    @CurrentUser() user: User
  ) {
    this.logger.log(
      `강의 삭제 요청 - ID: ${courseId}, 사용자: ${user.id}, 역할: ${user.role}`
    );

    const result = await this.coursesService.deleteCourse(courseId, user.id);

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
    @Body() uploadVideoUrlDto: any, // 임시로 직접 처리
    @CurrentUser() user: User
  ) {
    // 수동으로 데이터 검증
    const processedData = {
      fileName: uploadVideoUrlDto?.fileName || '',
      fileType: uploadVideoUrlDto?.fileType || '',
    };

    if (!processedData.fileName || !processedData.fileType) {
      throw new BadRequestException('파일명과 파일 타입은 필수입니다');
    }

    this.logger.log(
      `비디오 업로드 URL 요청 - 강의: ${courseId}, 챕터: ${chapterId}, 파일: ${processedData.fileName}, 사용자: ${user.id}`
    );

    const result =
      await this.coursesService.generateUploadVideoUrl(processedData);

    this.logger.log(`비디오 업로드 URL 생성 완료`);
    return result;
  }
}
