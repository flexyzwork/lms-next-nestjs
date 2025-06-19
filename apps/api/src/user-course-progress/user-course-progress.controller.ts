import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { UserCourseProgressService } from './user-course-progress.service';
import { ZodValidationPipe } from '@packages/common';
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// import type {} from // UpdateUserCourseProgressDto, // 임시로 비활성화
// UserCourseProgressParamsDto, // 임시로 비활성화
// UserEnrolledCoursesParamsDto, // 임시로 비활성화
// './dto/user-course-progress.dto.ts.backup';

// import {} from // UpdateUserCourseProgressSchema, // 임시로 비활성화
// UserCourseProgressParamsSchema, // 임시로 비활성화
// UserEnrolledCoursesParamsSchema, // 임시로 비활성화
// './dto/user-course-progress.dto.ts.backup';

// 다른 스키마들도 임시로 비활성화
/*
import {
  chapterProgressSchema,
  sectionProgressSchema,
  updateUserCourseProgressSchema,
} from '@packages/common';
*/

import type { User } from '@packages/common';

/**
 * 📈 사용자 강의 진도 관리 컨트롤러 (N+1 최적화 적용)
 *
 * 🚀 성능 최적화 기능:
 * - 단일 쿼리로 관련 데이터 조회
 * - 일괄 처리 엔드포인트 추가
 * - 통계 조회 최적화
 * - 트랜잭션 기반 업데이트
 *
 * 엔드포인트:
 * - GET /users/course-progress/:userId/enrolled-courses - 등록 강의 목록 조회 (인증 필요)
 * - GET /users/course-progress/:userId/courses/:courseId - 특정 강의 진도 조회 (인증 필요)
 * - PUT /users/course-progress/:userId/courses/:courseId - 강의 진도 업데이트 (인증 필요)
 * - GET /users/course-progress/batch - 다중 사용자 진도 일괄 조회 (관리자용)
 * - GET /users/course-progress/statistics/:courseId - 강의별 진도 통계 (관리자용)
 */
@ApiTags('사용자 강의 진도')
@Controller('users/course-progress')
@UseGuards(ApiJwtAuthGuard)
@ApiBearerAuth()
export class UserCourseProgressController {
  private readonly logger = new Logger(UserCourseProgressController.name);

  constructor(
    private readonly userCourseProgressService: UserCourseProgressService
  ) {}

  /**
   * 📚 사용자 등록 강의 목록 조회 (인증 필요, N+1 최적화)
   */
  @Get(':userId/enrolled-courses')
  @ApiOperation({
    summary: '등록 강의 목록 조회',
    description:
      '사용자가 등록한 모든 강의 목록을 조회합니다. (N+1 최적화 적용)',
  })
  @ApiResponse({ status: 200, description: '등록 강의 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 분당 30회 제한
  async getUserEnrolledCourses(
    @Param() params: any, // 임시로 직접 처리
    @CurrentUser() user: User
  ) {
    // 수동으로 파라미터 검증
    const processedParams = {
      userId: params?.userId || '',
    };

    if (!processedParams.userId) {
      throw new BadRequestException('사용자 ID가 필요합니다');
    }

    this.logger.log(
      `등록 강의 목록 조회 요청 - 대상: ${processedParams.userId}, 요청자: ${user.id}`
    );

    const result = await this.userCourseProgressService.getUserEnrolledCourses(
      processedParams.userId,
      user
    );

    this.logger.log(
      `등록 강의 목록 조회 완료 - ${result.data.length}개 강의 반환`
    );
    return result;
  }

  /**
   * 📊 특정 강의의 학습 진도 조회 (인증 필요, N+1 최적화)
   */
  @Get(':userId/courses/:courseId')
  @ApiOperation({
    summary: '강의 진도 조회',
    description: '특정 강의의 학습 진도를 조회합니다. (N+1 최적화 적용)',
  })
  @ApiResponse({ status: 200, description: '강의 진도 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  @ApiResponse({ status: 404, description: '진도 정보를 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 분당 50회 제한
  async getUserCourseProgress(
    @Param() params: any, // 임시로 직접 처리
    @CurrentUser() user: User
  ) {
    // 수동으로 파라미터 검증
    const processedParams = {
      userId: params?.userId || '',
      courseId: params?.courseId || '',
    };

    if (!processedParams.userId || !processedParams.courseId) {
      throw new BadRequestException('사용자 ID와 강의 ID가 필요합니다');
    }

    this.logger.log(
      `강의 진도 조회 요청 - 사용자: ${processedParams.userId}, 강의: ${processedParams.courseId}, 요청자: ${user.id}`
    );

    const result = await this.userCourseProgressService.getUserCourseProgress(
      processedParams.userId,
      processedParams.courseId,
      user
    );

    this.logger.log(
      `강의 진도 조회 완료 - 진도율: ${result.data.overallProgress}%`
    );
    return result;
  }

  /**
   * 📝 강의 학습 진도 업데이트 (인증 필요, N+1 최적화)
   */
  @Put(':userId/courses/:courseId')
  @ApiOperation({
    summary: '강의 진도 업데이트',
    description:
      '특정 강의의 학습 진도를 업데이트합니다. (트랜잭션 기반 최적화)',
  })
  @ApiResponse({ status: 200, description: '강의 진도 업데이트 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  @ApiResponse({ status: 404, description: '진도 정보를 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 분당 100회 제한 (학습 활동은 빈번함)
  async updateUserCourseProgress(
    @Param() params: any, // 임시로 직접 처리
    @Body() updateProgressDto: any, // 임시로 직접 처리
    @CurrentUser() user: User
  ) {
    // 수동으로 파라미터 검증
    const processedParams = {
      userId: params?.userId || '',
      courseId: params?.courseId || '',
    };

    if (!processedParams.userId || !processedParams.courseId) {
      throw new BadRequestException('사용자 ID와 강의 ID가 필요합니다');
    }

    // 수동으로 진도 데이터 처리
    const processedData = {
      sections: updateProgressDto?.sections || [],
      overallProgress: updateProgressDto?.overallProgress || undefined,
      lastAccessedChapterId:
        updateProgressDto?.lastAccessedChapterId || undefined,
    };

    this.logger.log(
      `강의 진도 업데이트 요청 - 사용자: ${processedParams.userId}, 강의: ${processedParams.courseId}, 요청자: ${user.id}`
    );

    const result =
      await this.userCourseProgressService.updateUserCourseProgress(
        processedParams.userId,
        processedParams.courseId,
        processedData,
        user
      );

    this.logger.log(
      `강의 진도 업데이트 완료 - 새 진도율: ${result.data.overallProgress}%`
    );
    return result;
  }

  /**
   * 🔍 다중 사용자 진도 일괄 조회 (관리자용, Batch 최적화)
   */
  @Get('batch')
  @ApiOperation({
    summary: '다중 사용자 진도 일괄 조회',
    description:
      '여러 사용자의 강의 진도를 일괄로 조회합니다. (관리자/강사용, Batch 최적화)',
  })
  @ApiResponse({ status: 200, description: '일괄 진도 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 대량 데이터 조회이므로 제한적
  async getBatchUserCourseProgress(
    @CurrentUser() user: User,
    @Body() body: { userIds: string[]; courseId?: string }
  ) {
    // 권한 검증: 관리자/강사만 접근 가능
    if (user.role !== 'admin' && user.role !== 'teacher') {
      throw new BadRequestException(
        '이 기능은 관리자나 강사만 사용할 수 있습니다'
      );
    }

    if (
      !body.userIds ||
      !Array.isArray(body.userIds) ||
      body.userIds.length === 0
    ) {
      throw new BadRequestException('사용자 ID 목록이 필요합니다');
    }

    this.logger.log(
      `일괄 진도 조회 요청 - 사용자 수: ${body.userIds.length}, 요청자: ${user.id}`
    );

    const result =
      await this.userCourseProgressService.getBatchUserCourseProgress(
        body.userIds,
        body.courseId,
        user
      );

    this.logger.log(`일괄 진도 조회 완료 - ${result.data.length}건 반환`);
    return result;
  }

  /**
   * 📈 강의별 진도 통계 조회 (관리자용, 집계 최적화)
   */
  @Get('statistics/:courseId')
  @ApiOperation({
    summary: '강의별 진도 통계 조회',
    description:
      '특정 강의의 전체 진도 통계를 조회합니다. (관리자/강사용, 집계 함수 최적화)',
  })
  @ApiResponse({ status: 200, description: '진도 통계 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 통계 조회는 비교적 빈번함
  async getCourseProgressStatistics(
    @Param('courseId') courseId: string,
    @CurrentUser() user: User
  ) {
    if (!courseId) {
      throw new BadRequestException('강의 ID가 필요합니다');
    }

    this.logger.log(
      `강의 진도 통계 조회 요청 - 강의: ${courseId}, 요청자: ${user.id}`
    );

    const result =
      await this.userCourseProgressService.getCourseProgressStatistics(
        courseId,
        user
      );

    this.logger.log(
      `강의 진도 통계 조회 완료 - 총 ${result.data.totalStudents}명`
    );
    return result;
  }
}
