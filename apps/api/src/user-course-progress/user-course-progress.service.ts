import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '@packages/database';
// import { UpdateUserCourseProgressDto } from './dto/user-course-progress.dto';
// 임시로 비활성화

import { User } from '@packages/common';

/**
 * 📈 사용자 강의 진도 관리 서비스
 *
 * 주요 기능:
 * - 등록 강의 목록 조회
 * - 강의별 학습 진도 조회 및 업데이트
 * - 진도율 자동 계산
 * - 권한 검증 (본인 또는 관리자만 접근)
 */
@Injectable()
export class UserCourseProgressService {
  private readonly logger = new Logger(UserCourseProgressService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 📚 사용자 등록 강의 목록 조회
   */
  async getUserEnrolledCourses(targetUserId: string, requestUser: User) {
    try {
      this.logger.log(`등록 강의 목록 조회 시작 - 대상: ${targetUserId}, 요청자: ${requestUser.id}`);

      // 권한 검증: 본인 또는 관리자만 조회 가능
      this.validateAccess(targetUserId, requestUser);

      // 등록된 강의 ID 목록 조회
      const enrolledCourses = await this.prismaService.userCourseProgress.findMany({
        where: { userId: targetUserId },
        select: { courseId: true },
      });

      const courseIds = enrolledCourses.map((item) => item.courseId);

      if (courseIds.length === 0) {
        this.logger.log(`등록된 강의 없음 - 사용자: ${targetUserId}`);
        return {
          message: '등록된 강의가 없습니다',
          data: [],
          count: 0,
        };
      }

      // 강의 상세 정보 조회
      const courses = await this.prismaService.course.findMany({
        where: { courseId: { in: courseIds } },
        include: {
          sections: {
            include: {
              chapters: true,
            },
            // orderBy: {
            //   createdAt: 'asc',
            // },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`등록 강의 목록 조회 완료 - ${courses.length}개 강의 반환`);

      return {
        message: '등록 강의 목록 조회 성공',
        data: courses,
        count: courses.length,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`등록 강의 목록 조회 중 오류 발생 - 사용자: ${targetUserId}`, error);
      throw new BadRequestException('등록 강의 목록을 조회하는 중 오류가 발생했습니다');
    }
  }

  /**
   * 📊 특정 강의의 학습 진도 조회
   */
  async getUserCourseProgress(targetUserId: string, courseId: string, requestUser: User) {
    try {
      this.logger.log(`강의 진도 조회 시작 - 사용자: ${targetUserId}, 강의: ${courseId}`);

      // 권한 검증: 본인 또는 관리자만 조회 가능
      this.validateAccess(targetUserId, requestUser);

      const progress = await this.prismaService.userCourseProgress.findUnique({
        where: {
          userId_courseId: {
            userId: targetUserId,
            courseId
          }
        },
        include: {
          course: {
            select: {
              courseId: true,
              title: true,
              teacherName: true,
              category: true,
            },
          },
        },
      });

      if (!progress) {
        this.logger.warn(`강의 진도를 찾을 수 없음 - 사용자: ${targetUserId}, 강의: ${courseId}`);
        throw new NotFoundException('이 사용자의 강의 진도를 찾을 수 없습니다');
      }

      this.logger.log(`강의 진도 조회 완료 - 진도율: ${progress.overallProgress}%`);

      return {
        message: '강의 진도 조회 성공',
        data: {
          ...progress,
          sections: this.parseSections(progress.sections),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`강의 진도 조회 중 오류 발생 - 사용자: ${targetUserId}, 강의: ${courseId}`, error);
      throw new BadRequestException('강의 진도를 조회하는 중 오류가 발생했습니다');
    }
  }

  /**
   * 📝 강의 학습 진도 업데이트
   */
  async updateUserCourseProgress(
    targetUserId: string,
    courseId: string,
    updateProgressDto: any, // 임시로 any 타입 사용
    requestUser: User,
  ) {
    try {
      this.logger.log(`강의 진도 업데이트 시작 - 사용자: ${targetUserId}, 강의: ${courseId}`);

      // 권한 검증: 본인만 수정 가능 (관리자도 직접 수정 불가, 로그 목적)
      if (targetUserId !== requestUser.id) {
        this.logger.warn(`강의 진도 수정 권한 없음 - 대상: ${targetUserId}, 요청자: ${requestUser.id}`);
        throw new ForbiddenException('본인의 학습 진도만 수정할 수 있습니다');
      }

      // 기존 진도 데이터 조회
      const existingProgress = await this.prismaService.userCourseProgress.findUnique({
        where: {
          userId_courseId: {
            userId: targetUserId,
            courseId
          }
        },
      });

      if (!existingProgress) {
        this.logger.warn(`기존 진도 데이터 없음 - 사용자: ${targetUserId}, 강의: ${courseId}`);
        throw new NotFoundException('이 강의의 진도 데이터를 찾을 수 없습니다');
      }

      // 섹션 데이터 병합 및 진도율 계산
      const existingSections = this.parseSections(existingProgress.sections);
      const newSections = updateProgressDto.sections || existingSections;
      const mergedSections = this.mergeSections(existingSections, newSections);
      const calculatedProgress = this.calculateOverallProgress(mergedSections);

      // 진도 데이터 업데이트
      const updatedProgress = await this.prismaService.userCourseProgress.update({
        where: {
          userId_courseId: {
            userId: targetUserId,
            courseId
          }
        },
        data: {
          sections: JSON.stringify(mergedSections),
          overallProgress: updateProgressDto.overallProgress ?? calculatedProgress,
          lastAccessedTimestamp: new Date(),
        },
        include: {
          course: {
            select: {
              courseId: true,
              title: true,
              teacherName: true,
              category: true,
            },
          },
        },
      });

      this.logger.log(`강의 진도 업데이트 완료 - 새 진도율: ${updatedProgress.overallProgress}%`);

      return {
        message: '강의 진도 업데이트 성공',
        data: {
          ...updatedProgress,
          sections: mergedSections,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`강의 진도 업데이트 중 오류 발생 - 사용자: ${targetUserId}, 강의: ${courseId}`, error);
      throw new BadRequestException('강의 진도를 업데이트하는 중 오류가 발생했습니다');
    }
  }

  /**
   * 🔒 접근 권한 검증
   * 본인 또는 관리자만 접근 가능
   */
  private validateAccess(targetUserId: string, requestUser: User): void {
    const isOwner = targetUserId === requestUser.id;
    const isAdmin = requestUser.role === 'admin' || requestUser.role === 'teacher';

    if (!isOwner && !isAdmin) {
      this.logger.warn(`접근 권한 없음 - 대상: ${targetUserId}, 요청자: ${requestUser.id}, 역할: ${requestUser.role}`);
      throw new ForbiddenException('이 정보에 접근할 권한이 없습니다');
    }
  }

  /**
   * 📊 전체 진도율 계산
   * 완료된 챕터 수 / 전체 챕터 수 * 100
   */
  private calculateOverallProgress(sections: any[]): number {
    if (!sections || sections.length === 0) {
      return 0;
    }

    let totalChapters = 0;
    let completedChapters = 0;

    sections.forEach((section) => {
      if (section.chapters && Array.isArray(section.chapters)) {
        totalChapters += section.chapters.length;
        completedChapters += section.chapters.filter((chapter: any) => chapter.completed).length;
      }
    });

    if (totalChapters === 0) {
      return 0;
    }

    const progress = Math.round((completedChapters / totalChapters) * 100);
    return Math.min(progress, 100); // 최대 100%
  }

  /**
   * 🔄 섹션 데이터 병합
   * 기존 데이터와 새 데이터를 병합하여 일관성 유지
   */
  private mergeSections(existingSections: any[], newSections: any[]): any[] {
    if (!existingSections || existingSections.length === 0) {
      return newSections || [];
    }

    if (!newSections || newSections.length === 0) {
      return existingSections;
    }

    const merged = [...existingSections];

    newSections.forEach((newSection) => {
      const existingIndex = merged.findIndex(
        (existing) => existing.sectionId === newSection.sectionId
      );

      if (existingIndex >= 0) {
        // 기존 섹션 업데이트
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...newSection,
          chapters: this.mergeChapters(
            merged[existingIndex].chapters || [],
            newSection.chapters || []
          ),
        };
      } else {
        // 새 섹션 추가
        merged.push(newSection);
      }
    });

    return merged;
  }

  /**
   * 🔄 챕터 데이터 병합
   */
  private mergeChapters(existingChapters: any[], newChapters: any[]): any[] {
    if (!existingChapters || existingChapters.length === 0) {
      return newChapters || [];
    }

    if (!newChapters || newChapters.length === 0) {
      return existingChapters;
    }

    const merged = [...existingChapters];

    newChapters.forEach((newChapter) => {
      const existingIndex = merged.findIndex(
        (existing) => existing.chapterId === newChapter.chapterId
      );

      if (existingIndex >= 0) {
        // 기존 챕터 업데이트 (완료 상태 우선 반영)
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...newChapter,
        };
      } else {
        // 새 챕터 추가
        merged.push(newChapter);
      }
    });

    return merged;
  }

  /**
   * 📄 JSON 섹션 데이터 파싱
   */
  private parseSections(sections: any): any[] {
    if (!sections) {
      return [];
    }

    if (typeof sections === 'string') {
      try {
        return JSON.parse(sections);
      } catch (error) {
        this.logger.warn('섹션 데이터 JSON 파싱 실패', error);
        return [];
      }
    }

    return Array.isArray(sections) ? sections : [];
  }
}
