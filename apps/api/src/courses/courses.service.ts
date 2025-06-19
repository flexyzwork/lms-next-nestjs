import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@packages/database';
import { generateId } from '@packages/common'; // 🆔 CUID2 생성자 사용
import { CreateCourseDto } from './dto/course.dto.ts.backup';
// 임시로 비활성화: UploadVideoUrlDto, UpdateCourseDto, UpdateCourseFormDataDto

// 🔧 타입 안전한 정렬 상수 정의
const ORDER_BY_INDEX_ASC: Prisma.SortOrder = 'asc';
const ORDER_BY_CREATED_DESC: Prisma.SortOrder = 'desc';

// 📊 섹션/챕터 정렬 설정
const SECTION_ORDER_BY: Prisma.SectionOrderByWithRelationInput = {
  orderIndex: ORDER_BY_INDEX_ASC,
};
const CHAPTER_ORDER_BY: Prisma.ChapterOrderByWithRelationInput = {
  orderIndex: ORDER_BY_INDEX_ASC,
};

// 🔧 유틸리티 함수: undefined 값 제거
function removeUndefinedFields<T extends Record<string, any>>(
  obj: T
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// 🏗️ 타입 정의 - Prisma 타입 추론을 위한 타입
type CourseWithSections = Prisma.CourseGetPayload<{
  include: {
    sections: {
      include: {
        chapters: true;
      };
    };
    _count: {
      select: {
        enrollments: true;
        transactions: true;
        comments: true;
      };
    };
  };
}>;

type CourseWithDetails = Prisma.CourseGetPayload<{
  include: {
    sections: {
      include: {
        chapters: {
          include: {
            _count: {
              select: { comments: true };
            };
            comments?: {
              select: {
                commentId: true;
                text: true;
                createdAt: true;
                user: {
                  select: {
                    id: true;
                    username: true;
                    firstName: true;
                    lastName: true;
                    avatar: true;
                  };
                };
              };
            };
          };
        };
      };
    };
    _count: {
      select: {
        enrollments: true;
        transactions: true;
        comments: true;
      };
    };
  };
}>;

/**
 * 📚 강의 관리 서비스
 *
 * 주요 기능:
 * - 강의 CRUD 작업
 * - 강의 목록 조회 (카테고리별 필터링)
 * - 비디오 업로드 URL 생성
 * - 권한 검증 및 데이터 검증
 */
@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);
  private readonly s3Client: S3Client;

  constructor(private readonly prismaService: PrismaService) {
    // S3 클라이언트 초기화
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-northeast-2',
    });
  }

  /**
   * 📋 강의 목록 조회 (카테고리별 필터링 지원)
   *
   * 성능 최적화:
   * - N+1 쿼리 문제 해결
   * - 단일 쿼리로 모든 데이터 로드
   * - 선택적 필드 로드로 네트워크 비용 절약
   */
  async findAllCourses(category?: string, includeDetails: boolean = true) {
    try {
      this.logger.log(
        `강의 목록 조회 시작 - 카테고리: ${category || '전체'}, 상세: ${includeDetails}`
      );

      // 카테고리 필터 조건 구성
      const whereClause: Prisma.CourseWhereInput = {
        status: 'Published' as const, // 공개된 강의만
        ...(category &&
          category !== 'all' &&
          category.trim() !== '' && {
            category: String(category).trim(),
          }),
      };

      this.logger.debug(`사용될 WHERE 조건:`, whereClause);

      // 🚀 단순화된 include 옵션 (타입 명시)
      const includeOptions: Prisma.CourseInclude = includeDetails
        ? {
            sections: {
              include: {
                chapters: {
                  orderBy: CHAPTER_ORDER_BY,
                },
              },
              orderBy: SECTION_ORDER_BY,
            },
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          }
        : {
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          };

      const courses = await this.prismaService.course.findMany({
        where: whereClause,
        include: includeOptions,
        orderBy: [
          { createdAt: ORDER_BY_CREATED_DESC }, // 최신순
        ],
      });

      this.logger.log(`강의 목록 조회 완료 - ${courses.length}개 강의 반환`);

      return {
        message: '강의 목록 조회 성공',
        data: courses,
        count: courses.length,
        optimized: true, // 성능 최적화 적용 표시
      };
    } catch (error) {
      this.logger.error('강의 목록 조회 중 오류 발생', error);
      throw new BadRequestException(
        '강의 목록을 조회하는 중 오류가 발생했습니다'
      );
    }
  }

  /**
   * 🚀 여러 강의 일괄 조회 (배치 최적화)
   *
   * 성능 최적화:
   * - 단일 쿼리로 여러 강의 데이터 조회
   * - 관리자 대시보드나 비교 기능에 활용
   */
  async getBatchCourses(courseIds: string[], includeDetails: boolean = true) {
    try {
      this.logger.log(`일괄 강의 조회 시작 - ${courseIds.length}개 강의`);

      if (courseIds.length === 0) {
        return {
          message: '조회할 강의가 없습니다',
          data: [],
          count: 0,
        };
      }

      // 🚀 단순화된 include 옵션 (타입 명시)
      const includeOptions: Prisma.CourseInclude = includeDetails
        ? {
            sections: {
              include: {
                chapters: {
                  orderBy: CHAPTER_ORDER_BY,
                },
              },
              orderBy: SECTION_ORDER_BY,
            },
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          }
        : {
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          };

      const courses = await this.prismaService.course.findMany({
        where: {
          courseId: { in: courseIds },
          status: 'Published' as const, // 공개된 강의만
        },
        include: includeOptions,
        orderBy: {
          createdAt: ORDER_BY_CREATED_DESC,
        },
      });

      this.logger.log(`일괄 강의 조회 완료 - ${courses.length}개 강의 반환`);

      return {
        message: '일괄 강의 조회 성공',
        data: courses,
        count: courses.length,
        optimized: true,
      };
    } catch (error) {
      this.logger.error('일괄 강의 조회 중 오류 발생', error);
      throw new BadRequestException('일괄 강의 조회 중 오류가 발생했습니다');
    }
  }

  /**
   * 📈 강의 통계 대시보드용 데이터 (집계 최적화)
   *
   * 성능 최적화:
   * - 집계 함수를 활용한 단일 쿼리 통계
   * - 강의별 세분화된 통계 정보 제공
   */
  async getCourseStatistics(courseId?: string) {
    try {
      this.logger.log(`강의 통계 조회 시작 - 대상: ${courseId || '전체'}`);

      const whereCondition = courseId
        ? { courseId }
        : { status: 'Published' as const };

      // 🚀 집계 쿼리로 기본 통계
      const [courseStats, enrollmentStats, transactionStats] =
        await Promise.all([
          // 강의 기본 통계
          this.prismaService.course.aggregate({
            where: whereCondition,
            _count: { courseId: true },
            _avg: { price: true },
            _sum: { price: true },
            _min: { price: true },
            _max: { price: true },
          }),

          // 등록 통계
          this.prismaService.enrollment.groupBy({
            by: ['courseId'],
            where: courseId ? { courseId } : {},
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 10, // 상위 10개 강의
          }),

          // 결제 통계
          this.prismaService.transaction.groupBy({
            by: ['courseId'],
            where: courseId ? { courseId } : {},
            _count: { transactionId: true },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 10, // 상위 10개 강의
          }),
        ]);

      // 카테고리별 통계
      const categoryStats = await this.prismaService.course.groupBy({
        by: ['category'],
        where: { status: 'Published' as const },
        _count: { courseId: true },
        orderBy: { _count: { courseId: 'desc' } },
      });

      this.logger.log(`강의 통계 조회 완료`);

      return {
        message: '강의 통계 조회 성공',
        data: {
          overview: {
            totalCourses: courseStats._count.courseId,
            averagePrice: Math.round(courseStats._avg.price || 0),
            totalRevenue: courseStats._sum.price || 0,
            priceRange: {
              min: courseStats._min.price || 0,
              max: courseStats._max.price || 0,
            },
          },
          enrollments: {
            topCourses: enrollmentStats,
            totalEnrollments: enrollmentStats.reduce(
              (sum, item) => sum + item._count.userId,
              0
            ),
          },
          transactions: {
            topRevenueCourses: transactionStats,
            totalTransactions: transactionStats.reduce(
              (sum, item) => sum + item._count.transactionId,
              0
            ),
            totalRevenue: transactionStats.reduce(
              (sum, item) => sum + (item._sum.amount || 0),
              0
            ),
          },
          categories: categoryStats,
        },
        optimized: true,
      };
    } catch (error) {
      this.logger.error('강의 통계 조회 중 오류 발생', error);
      throw new BadRequestException('강의 통계 조회 중 오류가 발생했습니다');
    }
  }

  /**
   * 🔍 특정 강의 상세 조회
   *
   * 성능 최적화:
   * - 선택적 데이터 로드
   * - 점진적 데이터 로딩 지원
   * - 통계 정보 효율적 수집
   */
  async findCourseById(courseId: string, includeComments: boolean = false) {
    try {
      this.logger.log(
        `강의 상세 조회 시작 - ID: ${courseId}, 댓글 포함: ${includeComments}`
      );

      // 🚀 단순화된 include 옵션
      const includeOptions = {
        sections: {
          include: {
            chapters: {
              include: {
                _count: {
                  select: { comments: true },
                },
                ...(includeComments && {
                  comments: {
                    take: 10, // 최근 댓글 10개
                    orderBy: { createdAt: 'desc' as const },
                    select: {
                      commentId: true,
                      text: true,
                      createdAt: true,
                      user: {
                        select: {
                          id: true,
                          username: true,
                          firstName: true,
                          lastName: true,
                          avatar: true,
                        },
                      },
                    },
                  },
                }),
              },
              orderBy: CHAPTER_ORDER_BY,
            },
          },
          orderBy: SECTION_ORDER_BY,
        },
        _count: {
          select: {
            enrollments: true,
            transactions: true,
            comments: true,
          },
        },
      };

      const course = (await this.prismaService.course.findUnique({
        where: { courseId },
        include: includeOptions,
      })) as CourseWithDetails | null;

      if (!course) {
        this.logger.warn(`강의를 찾을 수 없음 - ID: ${courseId}`);
        throw new NotFoundException('강의를 찾을 수 없습니다');
      }

      // 빈 sections 배열 보장
      course.sections = course.sections || [];

      // 📈 통계 정보 계산
      const totalChapters = course.sections.reduce(
        (sum, section) => sum + (section.chapters?.length || 0),
        0
      );

      const averageChaptersPerSection =
        course.sections.length > 0
          ? Math.round((totalChapters / course.sections.length) * 10) / 10
          : 0;

      this.logger.log(
        `강의 조회 완료 - 제목: ${course.title}, 섹션: ${course.sections.length}개, 총 챕터: ${totalChapters}개`
      );

      return {
        message: '강의 조회 성공',
        data: {
          ...course,
          stats: {
            totalSections: course.sections.length,
            totalChapters,
            averageChaptersPerSection,
            enrollmentCount: course._count.enrollments,
            transactionCount: course._count.transactions,
            commentCount: course._count.comments,
          },
        },
        optimized: true,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`강의 조회 중 오류 발생 - ID: ${courseId}`, error);
      throw new BadRequestException('강의를 조회하는 중 오류가 발생했습니다');
    }
  }

  /**
   * 📝 새 강의 생성
   */
  async createCourse(createCourseDto: CreateCourseDto, id: string) {
    try {
      this.logger.log(`강의 생성 시작 - 교사: ${createCourseDto.teacherName}`);

      const newCourse = (await this.prismaService.course.create({
        data: {
          courseId: generateId(), // 🆔 CUID2 사용
          teacherId: createCourseDto.teacherId,
          teacherName: createCourseDto.teacherName,
          title: '새 강의',
          description: '',
          category: '미분류',
          image: '',
          price: 0,
          level: 'Beginner',
          status: 'Draft',
        },
        include: {
          sections: {
            include: {
              chapters: true,
            },
          },
        },
      })) as CourseWithSections;

      this.logger.log(
        `강의 생성 완료 - ID: ${newCourse.courseId}, 제목: ${newCourse.title}`
      );

      return {
        message: '강의 생성 성공',
        data: newCourse,
      };
    } catch (error) {
      this.logger.error('강의 생성 중 오류 발생', error);
      throw new BadRequestException('강의를 생성하는 중 오류가 발생했습니다');
    }
  }

  /**
   * ✏️ 강의 정보 수정 (N+1 최적화 적용)
   *
   * 🚀 성능 최적화:
   * - 권한 확인을 WHERE 조건에 포함하여 별도 조회 제거
   * - 트랜잭션 기반 원자적 처리
   * - 필요한 데이터만 select로 조회
   */
  async updateCourse(
    courseId: string,
    updateCourseDto: any,
    userId: string,
    file: Express.Multer.File | undefined
  ) {
    try {
      this.logger.log(`강의 수정 시작 - ID: ${courseId}, 사용자: ${userId}`);
      this.logger.log(`Update Data:`, JSON.stringify(updateCourseDto, null, 2));

      // 🚀 N+1 최적화: 단일 트랜잭션으로 권한 확인과 업데이트를 동시에 처리
      const result = await this.prismaService.$transaction(async (tx) => {
        // 업데이트 데이터 준비
        const updateData = {
          title: updateCourseDto.title,
          description: updateCourseDto.description,
          category: updateCourseDto.category,
          level: updateCourseDto.level,
          status: updateCourseDto.status,
        };

        // undefined 값 제거 (타입 안전한 방식)
        const cleanedUpdateData = removeUndefinedFields(updateData);

        // 🚀 권한 확인과 업데이트를 단일 쿼리로 처리
        const updatedCourse = (await tx.course.update({
          where: {
            courseId,
            teacherId: userId, // 권한 확인을 WHERE 조건에 포함
          },
          data: cleanedUpdateData,
          include: {
            sections: {
              include: {
                chapters: {
                  orderBy: CHAPTER_ORDER_BY, // ✅ orderIndex 사용 (마이그레이션 후)
                },
              },
              orderBy: SECTION_ORDER_BY, // ✅ orderIndex 사용 (마이그레이션 후)
            },
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          },
        })) as CourseWithSections;

        return updatedCourse;
      });

      this.logger.log(
        `강의 수정 완료 - ID: ${courseId}, 제목: ${result?.title}`
      );

      return {
        message: '강의 수정 성공',
        data: result,
        optimized: true, // 최적화 적용 표시
      };
    } catch (error) {
      // Prisma P2025 에러: 레코드를 찾을 수 없음 (권한 없음 포함)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(
          `강의 수정 권한 없음 또는 강의 없음 - ID: ${courseId}, 사용자: ${userId}`
        );
        throw new ForbiddenException(
          '이 강의를 수정할 권한이 없거나 강의를 찾을 수 없습니다'
        );
      }

      // Prisma P2022 에러: 컬럼을 찾을 수 없음 (orderIndex 필드 누락)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2022'
      ) {
        this.logger.error(
          `데이터베이스 스키마 오류 - orderIndex 필드 누락: ${error.meta?.column}`
        );
        throw new BadRequestException(
          '데이터베이스 스키마 업데이트가 필요합니다. 관리자에게 문의하세요.'
        );
      }

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `강의 수정 중 오류 발생 - ID: ${courseId}, 사용자: ${userId}`,
        error
      );
      throw new BadRequestException(
        '강의를 수정하는 중 예상치 못한 오류가 발생했습니다'
      );
    }
  }

  /**
   * 🗑️ 강의 삭제 (최적화 적용)
   *
   * 🚀 성능 최적화:
   * - 권한 확인과 삭제를 단일 쿼리로 처리
   * - 별도 조회 없이 원자적 삭제
   */
  async deleteCourse(courseId: string, userId: string) {
    try {
      this.logger.log(`강의 삭제 시작 - ID: ${courseId}, 사용자: ${userId}`);

      // 🚀 최적화: 단일 쿼리로 권한 확인 + 삭제
      const deletedCourse = await this.prismaService.course.delete({
        where: {
          courseId,
          teacherId: userId, // 권한 확인을 WHERE 조건에 포함
        },
        select: {
          courseId: true,
          title: true,
        },
      });

      this.logger.log(
        `강의 삭제 완료 - ID: ${courseId}, 제목: ${deletedCourse.title}`
      );

      return {
        message: '강의 삭제 성공',
        data: deletedCourse,
        optimized: true, // 최적화 적용 표시
      };
    } catch (error) {
      // Prisma P2025 에러: 레코드를 찾을 수 없음 (권한 없음 포함)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(
          `강의 삭제 권한 없음 또는 강의 없음 - ID: ${courseId}, 사용자: ${userId}`
        );
        throw new ForbiddenException(
          '이 강의를 삭제할 권한이 없거나 강의를 찾을 수 없습니다'
        );
      }

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(`강의 삭제 중 오류 발생 - ID: ${courseId}`, error);
      throw new BadRequestException('강의를 삭제하는 중 오류가 발생했습니다');
    }
  }

  /**
   * 📹 비디오 업로드를 위한 S3 미리 서명된 URL 생성
   */
  async generateUploadVideoUrl(uploadVideoUrlDto: any) {
    try {
      this.logger.log(
        `비디오 업로드 URL 생성 시작 - 파일: ${uploadVideoUrlDto.fileName}`
      );

      const { fileName, fileType } = uploadVideoUrlDto;

      // 파일 확장자 검증
      const allowedVideoTypes = [
        'video/mp4',
        'video/mov',
        'video/avi',
        'video/mkv',
      ];
      if (!allowedVideoTypes.includes(fileType)) {
        throw new BadRequestException(
          '지원하지 않는 비디오 형식입니다. MP4, MOV, AVI, MKV만 지원됩니다.'
        );
      }

      // S3 키 생성 (CUID2 고유 ID 포함)
      const uniqueId = generateId(); // 🆔 CUID2 사용
      const s3Key = `videos/${uniqueId}/${fileName}`;

      // S3 업로드 파라미터
      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        ContentType: fileType,
      };

      if (!process.env.S3_BUCKET_NAME) {
        this.logger.error('S3_BUCKET_NAME 환경변수가 설정되지 않음');
        throw new BadRequestException('스토리지 설정이 올바르지 않습니다');
      }

      // 미리 서명된 URL 생성 (5분 유효)
      const command = new PutObjectCommand(s3Params);
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 300, // 5분
      });

      // CloudFront 도메인을 통한 비디오 URL 생성
      const videoUrl = process.env.CLOUDFRONT_DOMAIN
        ? `${process.env.CLOUDFRONT_DOMAIN}/videos/${uniqueId}/${fileName}`
        : `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/videos/${uniqueId}/${fileName}`;

      this.logger.log(`비디오 업로드 URL 생성 완료 - 키: ${s3Key}`);

      return {
        message: '비디오 업로드 URL 생성 성공',
        data: {
          uploadUrl,
          videoUrl,
          expiresIn: 300,
          fileSize: '최대 500MB',
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('비디오 업로드 URL 생성 중 오류 발생', error);
      throw new BadRequestException(
        '비디오 업로드 URL을 생성하는 중 오류가 발생했습니다'
      );
    }
  }
}
