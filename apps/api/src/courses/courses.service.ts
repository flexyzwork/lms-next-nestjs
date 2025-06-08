import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '@packages/database';
import { CreateCourseDto, UpdateCourseDto, UpdateCourseFormDataDto, UploadVideoUrlDto } from './dto/course.dto';

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
      region: process.env.AWS_REGION || 'ap-northeast-2'
    });
  }

  /**
   * 📋 강의 목록 조회 (카테고리별 필터링 지원)
   */
  async findAllCourses(category?: string) {
    try {
      this.logger.log(`강의 목록 조회 시작 - 카테고리: ${category || '전체'}`);

      const whereClause = category && category !== 'all'
        ? { category: String(category) }
        : undefined;

      const courses = await this.prismaService.course.findMany({
        where: whereClause,
        include: {
          sections: {
            include: {
              chapters: true,
            },
          },
        },
        // orderBy: {
        //   createdAt: 'desc',
        // },
      });

      this.logger.log(`강의 목록 조회 완료 - ${courses.length}개 강의 반환`);

      return {
        message: '강의 목록 조회 성공',
        data: courses,
        count: courses.length,
      };
    } catch (error) {
      this.logger.error('강의 목록 조회 중 오류 발생', error);
      throw new BadRequestException('강의 목록을 조회하는 중 오류가 발생했습니다');
    }
  }

  /**
   * 🔍 특정 강의 상세 조회
   */
  async findCourseById(courseId: string) {
    try {
      this.logger.log(`강의 상세 조회 시작 - ID: ${courseId}`);

      const course = await this.prismaService.course.findUnique({
        where: { courseId },
        include: {
          sections: {
            include: {
              chapters: true
            },
            // orderBy: {
            //   createdAt: 'asc',
            // },
          },
        },
      });

      if (!course) {
        this.logger.warn(`강의를 찾을 수 없음 - ID: ${courseId}`);
        throw new NotFoundException('강의를 찾을 수 없습니다');
      }

      // 빈 sections 배열 보장
      course.sections = course.sections || [];

      this.logger.log(`강의 조회 완료 - 제목: ${course.title}, 섹션 수: ${course.sections.length}`);

      return {
        message: '강의 조회 성공',
        data: course,
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
  async createCourse(createCourseDto: CreateCourseDto) {
    try {
      this.logger.log(`강의 생성 시작 - 교사: ${createCourseDto.teacherName}`);

      const newCourse = await this.prismaService.course.create({
        data: {
          courseId: uuidv4(),
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
      });

      this.logger.log(`강의 생성 완료 - ID: ${newCourse.courseId}, 제목: ${newCourse.title}`);

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
   * ✏️ 강의 정보 수정 (트랜잭션 적용)
   */
  async updateCourse(
    courseId: string,
    updateCourseDto: UpdateCourseFormDataDto,
    userId: string,
    file?: Express.Multer.File
  ) {
    try {
      this.logger.log(`강의 수정 시작 - ID: ${courseId}, 사용자: ${userId}`);

      // 기존 강의 조회 및 권한 확인
      const existingCourse = await this.prismaService.course.findUnique({
        where: { courseId },
        include: {
          sections: {
            include: {
              chapters: true
            }
          },
        },
      });

      if (!existingCourse) {
        throw new NotFoundException('강의를 찾을 수 없습니다');
      }

      if (existingCourse.teacherId !== userId) {
        this.logger.warn(`강의 수정 권한 없음 - 강의 소유자: ${existingCourse.teacherId}, 요청자: ${userId}`);
        throw new ForbiddenException('이 강의를 수정할 권한이 없습니다');
      }

      // 가격 변환 처리 (원 단위 → 센트 단위)
      let updateData = { ...updateCourseDto };
      if (updateData.price !== undefined) {
        const price = Number(updateData.price);
        if (isNaN(price) || price < 0) {
          throw new BadRequestException('올바른 가격을 입력해주세요');
        }
        updateData.price = price * 100; // 원을 센트로 변환
      }

      // sections 데이터 파싱 및 검증
      if (typeof updateData.sections === 'string') {
        try {
          updateData.sections = JSON.parse(updateData.sections);
        } catch (parseError) {
          this.logger.error('sections JSON 파싱 오류', parseError);
          throw new BadRequestException('sections 데이터 형식이 올바르지 않습니다');
        }
      }

      // sections 데이터 정규화
      const normalizedSections = Array.isArray(updateData.sections)
        ? updateData.sections.map((section: any) => ({
            sectionId: section.sectionId || uuidv4(),
            sectionTitle: section.sectionTitle,
            sectionDescription: section.sectionDescription || '',
            chapters: Array.isArray(section.chapters)
              ? section.chapters.map((chapter: any) => ({
                  chapterId: chapter.chapterId || uuidv4(),
                  type: chapter.type as 'Text' | 'Quiz' | 'Video',
                  title: chapter.title,
                  content: chapter.content || '',
                  video: chapter.video || '',
                }))
              : [],
          }))
        : [];

      // 트랜잭션으로 데이터 업데이트
      const updatedCourse = await this.prismaService.$transaction(async (tx) => {
        // 강의 기본 정보 업데이트
        const courseUpdate = await tx.course.update({
          where: { courseId },
          data: {
            title: updateData.title,
            description: updateData.description,
            category: updateData.category,
            price: updateData.price,
            level: updateData.level as any, // Type assertion since we know the form data is validated
            status: updateData.status as any, // Type assertion since we know the form data is validated
          },
        });

        // 섹션과 챕터 업데이트
        for (const section of normalizedSections) {
          await tx.section.upsert({
            where: { sectionId: section.sectionId },
            update: {
              sectionTitle: section.sectionTitle,
              sectionDescription: section.sectionDescription,
            },
            create: {
              sectionId: section.sectionId,
              courseId,
              sectionTitle: section.sectionTitle,
              sectionDescription: section.sectionDescription,
            },
          });

          // 각 섹션의 챕터들 업데이트
          for (const chapter of section.chapters) {
            await tx.chapter.upsert({
              where: { chapterId: chapter.chapterId },
              update: {
                type: chapter.type,
                title: chapter.title,
                content: chapter.content,
                video: chapter.video,
              },
              create: {
                chapterId: chapter.chapterId,
                sectionId: section.sectionId,
                type: chapter.type,
                title: chapter.title,
                content: chapter.content,
                video: chapter.video,
              },
            });
          }
        }

        // 최종 업데이트된 강의 반환
        return await tx.course.findUnique({
          where: { courseId },
          include: {
            sections: {
              include: {
                chapters: true
              },
              // orderBy: {
              //   createdAt: 'asc',
              // },
            }
          },
        });
      });

      this.logger.log(`강의 수정 완료 - ID: ${courseId}, 제목: ${updatedCourse?.title}`);

      return {
        message: '강의 수정 성공',
        data: updatedCourse,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`강의 수정 중 오류 발생 - ID: ${courseId}`, error);
      throw new BadRequestException('강의를 수정하는 중 오류가 발생했습니다');
    }
  }

  /**
   * 🗑️ 강의 삭제
   */
  async deleteCourse(courseId: string, userId: string) {
    try {
      this.logger.log(`강의 삭제 시작 - ID: ${courseId}, 사용자: ${userId}`);

      // 기존 강의 조회 및 권한 확인
      const course = await this.prismaService.course.findUnique({
        where: { courseId },
      });

      if (!course) {
        throw new NotFoundException('강의를 찾을 수 없습니다');
      }

      if (course.teacherId !== userId) {
        this.logger.warn(`강의 삭제 권한 없음 - 강의 소유자: ${course.teacherId}, 요청자: ${userId}`);
        throw new ForbiddenException('이 강의를 삭제할 권한이 없습니다');
      }

      // 강의 삭제 (Cascade로 관련 데이터도 함께 삭제됨)
      await this.prismaService.course.delete({
        where: { courseId }
      });

      this.logger.log(`강의 삭제 완료 - ID: ${courseId}, 제목: ${course.title}`);

      return {
        message: '강의 삭제 성공',
        data: {
          courseId,
          title: course.title,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`강의 삭제 중 오류 발생 - ID: ${courseId}`, error);
      throw new BadRequestException('강의를 삭제하는 중 오류가 발생했습니다');
    }
  }

  /**
   * 📹 비디오 업로드를 위한 S3 미리 서명된 URL 생성
   */
  async generateUploadVideoUrl(uploadVideoUrlDto: UploadVideoUrlDto) {
    try {
      this.logger.log(`비디오 업로드 URL 생성 시작 - 파일: ${uploadVideoUrlDto.fileName}`);

      const { fileName, fileType } = uploadVideoUrlDto;

      // 파일 확장자 검증
      const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv'];
      if (!allowedVideoTypes.includes(fileType)) {
        throw new BadRequestException('지원하지 않는 비디오 형식입니다. MP4, MOV, AVI, MKV만 지원됩니다.');
      }

      // S3 키 생성 (고유 ID 포함)
      const uniqueId = uuidv4();
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
        expiresIn: 300 // 5분
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
      throw new BadRequestException('비디오 업로드 URL을 생성하는 중 오류가 발생했습니다');
    }
  }
}
