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
  BadRequestException, // 새로 추가
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

import type {
  // UpdateUserCourseProgressDto, // 임시로 비활성화
  // UserCourseProgressParamsDto, // 임시로 비활성화
  // UserEnrolledCoursesParamsDto, // 임시로 비활성화
} from './dto/user-course-progress.dto';

import {
  // UpdateUserCourseProgressSchema, // 임시로 비활성화
  // UserCourseProgressParamsSchema, // 임시로 비활성화
  // UserEnrolledCoursesParamsSchema, // 임시로 비활성화
} from './dto/user-course-progress.dto';

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
 * 📈 사용자 강의 진도 관리 컨트롤러
 *
 * 엔드포인트:
 * - GET /users/course-progress/:userId/enrolled-courses - 등록 강의 목록 조회 (인증 필요)
 * - GET /users/course-progress/:userId/courses/:courseId - 특정 강의 진도 조회 (인증 필요)
 * - PUT /users/course-progress/:userId/courses/:courseId - 강의 진도 업데이트 (인증 필요)
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
   * 📚 사용자 등록 강의 목록 조회 (인증 필요)
   */
  @Get(':userId/enrolled-courses')
  @ApiOperation({
    summary: '등록 강의 목록 조회',
    description: '사용자가 등록한 모든 강의 목록을 조회합니다.',
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
      userId: params?.userId || ''
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
   * 📊 특정 강의의 학습 진도 조회 (인증 필요)
   */
  @Get(':userId/courses/:courseId')
  @ApiOperation({
    summary: '강의 진도 조회',
    description: '특정 강의의 학습 진도를 조회합니다.',
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
      courseId: params?.courseId || ''
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
   * 📝 강의 학습 진도 업데이트 (인증 필요)
   */
  @Put(':userId/courses/:courseId')
  @ApiOperation({
    summary: '강의 진도 업데이트',
    description: '특정 강의의 학습 진도를 업데이트합니다.',
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
      courseId: params?.courseId || ''
    };
    
    if (!processedParams.userId || !processedParams.courseId) {
      throw new BadRequestException('사용자 ID와 강의 ID가 필요합니다');
    }
    
    // 수동으로 진도 데이터 처리
    const processedData = {
      sections: updateProgressDto?.sections || [],
      overallProgress: updateProgressDto?.overallProgress || undefined,
      lastAccessedChapterId: updateProgressDto?.lastAccessedChapterId || undefined
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
}
