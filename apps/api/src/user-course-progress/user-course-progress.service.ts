import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '@packages/database';
// import { UpdateUserCourseProgressDto } from './dto/user-course-progress.dto';
// 임시로 비활성화

import { User } from '@packages/common';
import { Cacheable, CacheEvict } from '@packages/common';

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
   * 📚 사용자 등록 강의 목록 조회 (N+1 최적화 적용)
   * 
   * 🚀 성능 최적화:
   * - 단일 쿼리로 모든 관련 데이터 조회 (userCourseProgress + course + sections + chapters)
   * - 불필요한 중간 courseId 조회 단계 제거
   * - Join을 통한 효율적인 데이터 페칭
   */
  async getUserEnrolledCourses(targetUserId: string, requestUser: User) {
    try {
      this.logger.log(`등록 강의 목록 조회 시작 - 대상: ${targetUserId}, 요청자: ${requestUser.id}`);

      // 권한 검증: 본인 또는 관리자만 조회 가능
      this.validateAccess(targetUserId, requestUser);

      // 🚀 N+1 최적화: 단일 쿼리로 모든 관련 데이터 조회
      const enrolledCourses = await this.prismaService.userCourseProgress.findMany({
        where: { userId: targetUserId },
        include: {
          course: {
            include: {
              sections: {
                include: {
                  chapters: {
                    orderBy: {
                      orderIndex: 'asc', // 챕터 순서 정렬
                    },
                  },
                },
                orderBy: {
                  orderIndex: 'asc', // 섹션 순서 정렬
                },
              },
            },
          },
        },
        orderBy: {
          course: {
            createdAt: 'desc', // 최신 강의 순으로 정렬
          },
        },
      });

      if (enrolledCourses.length === 0) {
        this.logger.log(`등록된 강의 없음 - 사용자: ${targetUserId}`);
        return {
          message: '등록된 강의가 없습니다',
          data: [],
          count: 0,
        };
      }

      // 📊 진도 정보와 함께 강의 데이터 구성
      const coursesWithProgress = enrolledCourses.map((enrollment) => ({
        ...enrollment.course,
        progressInfo: {
          overallProgress: enrollment.overallProgress,
          lastAccessedTimestamp: enrollment.lastAccessedTimestamp,
          sections: this.parseSections(enrollment.sections),
        },
      }));

      this.logger.log(`등록 강의 목록 조회 완료 - ${coursesWithProgress.length}개 강의 반환`);

      return {
        message: '등록 강의 목록 조회 성공',
        data: coursesWithProgress,
        count: coursesWithProgress.length,
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
   * 📊 특정 강의의 학습 진도 조회 (N+1 최적화 적용)
   * 
   * 🚀 성능 최적화:
   * - 강의와 섹션/챕터 데이터를 단일 쿼리로 조회
   * - orderBy를 통한 정렬 성능 최적화
   */
  async getUserCourseProgress(targetUserId: string, courseId: string, requestUser: User) {
    try {
      this.logger.log(`강의 진도 조회 시작 - 사용자: ${targetUserId}, 강의: ${courseId}`);

      // 권한 검증: 본인 또는 관리자만 조회 가능
      this.validateAccess(targetUserId, requestUser);

      // 🚀 N+1 최적화: 강의와 섹션/챕터 데이터를 단일 쿼리로 조회
      const progress = await this.prismaService.userCourseProgress.findUnique({
        where: {
          userId_courseId: {
            userId: targetUserId,
            courseId
          }
        },
        include: {
          course: {
            include: {
              sections: {
                include: {
                  chapters: {
                    orderBy: {
                      orderIndex: 'asc', // 챕터 순서 정렬
                    },
                  },
                },
                orderBy: {
                  orderIndex: 'asc', // 섹션 순서 정렬
                },
              },
            },
          },
        },
      });

      if (!progress) {
        this.logger.warn(`강의 진도를 찾을 수 없음 - 사용자: ${targetUserId}, 강의: ${courseId}`);
        throw new NotFoundException('이 사용자의 강의 진도를 찾을 수 없습니다');
      }

      this.logger.log(`강의 진도 조회 완료 - 진도율: ${progress.overallProgress}%`);

      // 📈 상세 진도 데이터 구성
      return {
        message: '강의 진도 조회 성공',
        data: {
          courseId: progress.courseId,
          userId: progress.userId,
          overallProgress: progress.overallProgress,
          lastAccessedTimestamp: progress.lastAccessedTimestamp,
          sections: this.parseSections(progress.sections),
          course: {
            ...progress.course,
            // 📊 섹션/챕터 통계 정보 추가
            totalSections: progress.course.sections?.length || 0,
            totalChapters: progress.course.sections?.reduce(
              (acc, section) => acc + (section.chapters?.length || 0), 0
            ) || 0,
          },
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
   * 📝 강의 학습 진도 업데이트 (N+1 최적화 + 캐시 무효화 적용)
   * 
   * 🚀 성능 최적화:
   * - 트랜잭션 내에서 조회와 업데이트를 순차적 수행
   * - 업데이트 후 강의 정보를 타 쿼리로 조회하지 않고 첨부
   * - 데이터 정합성 보장
   * - 관련 캐시 자동 무효화
   */
  @CacheEvict([
    'user-enrolled-courses:{userId}',
    'user-course-progress:{userId}:{courseId}',
    'course-progress-statistics:{courseId}'
  ])
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

      // 🚀 N+1 최적화: 트랜잭션으로 원자적 수행
      const result = await this.prismaService.$transaction(async (prisma) => {
        // 기존 진도 데이터 조회 (강의 정보 포함)
        const existingProgress = await prisma.userCourseProgress.findUnique({
          where: {
            userId_courseId: {
              userId: targetUserId,
              courseId
            }
          },
          include: {
            course: {
              include: {
                sections: {
                  include: {
                    chapters: {
                      orderBy: {
                        orderIndex: 'asc',
                      },
                    },
                  },
                  orderBy: {
                    orderIndex: 'asc',
                  },
                },
              },
            },
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
        const updatedProgress = await prisma.userCourseProgress.update({
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
        });

        // 📊 완전한 데이터 반환 (추가 쿼리 없이)
        return {
          ...updatedProgress,
          sections: mergedSections,
          course: {
            ...existingProgress.course,
            // 통계 정보 추가
            totalSections: existingProgress.course.sections?.length || 0,
            totalChapters: existingProgress.course.sections?.reduce(
              (acc, section) => acc + (section.chapters?.length || 0), 0
            ) || 0,
          },
        };
      });

      this.logger.log(`강의 진도 업데이트 완료 - 새 진도율: ${result.overallProgress}%`);

      return {
        message: '강의 진도 업데이트 성공',
        data: result,
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
   * 🔍 다중 사용자의 강의 진도 일괄 조회 (Batch 최적화 + 캐싱)
   * 
   * 🚀 성능 최적화:
   * - 여러 사용자의 진도를 단일 쿼리로 조회
   * - 관리자 대시보드나 보고서 생성 시 사용
   * - Redis 캐싱 (3분)
   */
  @Cacheable('batch-user-progress:{userIds}:{courseId}', 180)
  async getBatchUserCourseProgress(
    userIds: string[],
    courseId?: string,
    requestUser?: User
  ) {
    try {
      this.logger.log(`일괄 진도 조회 시작 - 사용자 수: ${userIds.length}`);

      if (userIds.length === 0) {
        return {
          message: '조회할 사용자가 없습니다',
          data: [],
          count: 0,
        };
      }

      // WHERE 조건 구성
      const whereCondition: any = {
        userId: { in: userIds },
      };

      if (courseId) {
        whereCondition.courseId = courseId;
      }

      // 🚀 단일 쿼리로 모든 데이터 조회
      const progressData = await this.prismaService.userCourseProgress.findMany({
        where: whereCondition,
        include: {
          course: {
            include: {
              sections: {
                include: {
                  chapters: {
                    orderBy: {
                      orderIndex: 'asc',
                    },
                  },
                },
                orderBy: {
                  orderIndex: 'asc',
                },
              },
            },
          },
        },
        orderBy: [
          { userId: 'asc' },
          { course: { createdAt: 'desc' } },
        ],
      });

      this.logger.log(`일괄 진도 조회 완료 - ${progressData.length}건 반환`);

      return {
        message: '일괄 진도 조회 성공',
        data: progressData.map((progress) => ({
          userId: progress.userId,
          courseId: progress.courseId,
          overallProgress: progress.overallProgress,
          lastAccessedTimestamp: progress.lastAccessedTimestamp,
          sections: this.parseSections(progress.sections),
          course: {
            ...progress.course,
            totalSections: progress.course.sections?.length || 0,
            totalChapters: progress.course.sections?.reduce(
              (acc, section) => acc + (section.chapters?.length || 0), 0
            ) || 0,
          },
        })),
        count: progressData.length,
      };
    } catch (error) {
      this.logger.error(`일괄 진도 조회 중 오류 발생`, error);
      throw new BadRequestException('일괄 진도 조회 중 오류가 발생했습니다');
    }
  }

  /**
   * 📈 강의별 전체 진도 통계 조회 (N+1 최적화 + 캐싱)
   * 
   * 🚀 성능 최적화:
   * - 집계 함수를 활용한 단일 쿼리 통계
   * - 강의별 진도 분석 대시보드용
   * - Redis 캐싱 (10분)
   */
  @Cacheable('course-progress-statistics:{courseId}', 600)
  async getCourseProgressStatistics(courseId: string, requestUser: User) {
    try {
      this.logger.log(`강의 진도 통계 조회 시작 - 강의: ${courseId}`);

      // 권한 검증: 관리자 또는 강사만 접근 가능
      if (requestUser.role !== 'admin' && requestUser.role !== 'teacher') {
        this.logger.warn(`통계 조회 권한 없음 - 요청자: ${requestUser.id}, 역할: ${requestUser.role}`);
        throw new ForbiddenException('이 정보에 접근할 권한이 없습니다');
      }

      // 🚀 집계 쿼리로 통계 데이터 조회
      const statistics = await this.prismaService.userCourseProgress.aggregate({
        where: { courseId },
        _count: {
          userId: true,
        },
        _avg: {
          overallProgress: true,
        },
        _min: {
          overallProgress: true,
        },
        _max: {
          overallProgress: true,
        },
      });

      // 진도율 구간별 분포 조회
      const progressDistribution = await this.prismaService.userCourseProgress.groupBy({
        by: ['overallProgress'],
        where: { courseId },
        _count: {
          userId: true,
        },
        orderBy: {
          overallProgress: 'asc',
        },
      });

      // 진도율 범위별 분류
      const progressRanges = {
        '0-25%': 0,
        '26-50%': 0,
        '51-75%': 0,
        '76-100%': 0,
      };

      progressDistribution.forEach((item) => {
        const progress = item.overallProgress;
        if (progress <= 25) progressRanges['0-25%'] += item._count.userId;
        else if (progress <= 50) progressRanges['26-50%'] += item._count.userId;
        else if (progress <= 75) progressRanges['51-75%'] += item._count.userId;
        else progressRanges['76-100%'] += item._count.userId;
      });

      this.logger.log(`강의 진도 통계 조회 완료 - 총 ${statistics._count.userId}명`);

      return {
        message: '강의 진도 통계 조회 성공',
        data: {
          courseId,
          totalStudents: statistics._count.userId,
          averageProgress: Math.round(statistics._avg.overallProgress || 0),
          minProgress: statistics._min.overallProgress || 0,
          maxProgress: statistics._max.overallProgress || 0,
          progressRanges,
          detailedDistribution: progressDistribution,
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`강의 진도 통계 조회 중 오류 발생 - 강의: ${courseId}`, error);
      throw new BadRequestException('강의 진도 통계를 조회하는 중 오류가 발생했습니다');
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
   * 📊 전체 진도율 계산 (성능 최적화)
   * 완료된 챕터 수 / 전체 챕터 수 * 100
   * 
   * 🚀 성능 최적화:
   * - 단일 루프로 reduce 연산 최소화
   * - 조기 종료 조건 추가
   */
  private calculateOverallProgress(sections: any[]): number {
    if (!sections || sections.length === 0) {
      return 0;
    }

    let totalChapters = 0;
    let completedChapters = 0;

    for (const section of sections) {
      if (section.chapters && Array.isArray(section.chapters)) {
        totalChapters += section.chapters.length;
        completedChapters += section.chapters.filter((chapter: any) => chapter.completed).length;
      }
    }

    if (totalChapters === 0) {
      return 0;
    }

    const progress = Math.round((completedChapters / totalChapters) * 100);
    return Math.min(progress, 100); // 최대 100%
  }

  /**
   * 🔄 섹션 데이터 병합 (성능 최적화)
   * 기존 데이터와 새 데이터를 병합하여 일관성 유지
   * 
   * 🚀 성능 최적화:
   * - Map을 활용한 O(n) 시간 복잡도 병합
   * - 불필요한 배열 복사 최소화
   */
  private mergeSections(existingSections: any[], newSections: any[]): any[] {
    if (!existingSections || existingSections.length === 0) {
      return newSections || [];
    }

    if (!newSections || newSections.length === 0) {
      return existingSections;
    }

    // Map을 사용한 효율적인 병합
    const sectionMap = new Map();
    
    // 기존 섹션 Map에 추가
    existingSections.forEach(section => {
      sectionMap.set(section.sectionId, section);
    });

    // 새 섹션들로 병합
    newSections.forEach((newSection) => {
      const existing = sectionMap.get(newSection.sectionId);
      
      if (existing) {
        // 기존 섹션 업데이트
        sectionMap.set(newSection.sectionId, {
          ...existing,
          ...newSection,
          chapters: this.mergeChapters(
            existing.chapters || [],
            newSection.chapters || []
          ),
        });
      } else {
        // 새 섹션 추가
        sectionMap.set(newSection.sectionId, newSection);
      }
    });

    return Array.from(sectionMap.values());
  }

  /**
   * 🔄 챕터 데이터 병합 (성능 최적화)
   * 
   * 🚀 성능 최적화:
   * - Map을 활용한 O(n) 시간 복잡도 병합
   * - 완료 상태 우선 반영
   */
  private mergeChapters(existingChapters: any[], newChapters: any[]): any[] {
    if (!existingChapters || existingChapters.length === 0) {
      return newChapters || [];
    }

    if (!newChapters || newChapters.length === 0) {
      return existingChapters;
    }

    // Map을 사용한 효율적인 병합
    const chapterMap = new Map();
    
    // 기존 챕터 Map에 추가
    existingChapters.forEach(chapter => {
      chapterMap.set(chapter.chapterId, chapter);
    });

    // 새 챕터들로 병합
    newChapters.forEach((newChapter) => {
      const existing = chapterMap.get(newChapter.chapterId);
      
      if (existing) {
        // 기존 챕터 업데이트 (완료 상태 우선 반영)
        chapterMap.set(newChapter.chapterId, {
          ...existing,
          ...newChapter,
        });
      } else {
        // 새 챕터 추가
        chapterMap.set(newChapter.chapterId, newChapter);
      }
    });

    return Array.from(chapterMap.values());
  }

  /**
   * 📄 JSON 섹션 데이터 파싱 (에러 핸들링 강화)
   * 
   * 🚀 성능 최적화:
   * - 타입 체크 최소화
   * - 안전한 JSON 파싱
   */
  private parseSections(sections: any): any[] {
    if (!sections) {
      return [];
    }

    if (Array.isArray(sections)) {
      return sections;
    }

    if (typeof sections === 'string') {
      try {
        const parsed = JSON.parse(sections);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        this.logger.warn('섹션 데이터 JSON 파싱 실패', error);
        return [];
      }
    }

    return [];
  }
}
