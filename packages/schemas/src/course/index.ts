// ==============================
// 🎓 강의 관련 통합 스키마
// API 서비스와 웹 클라이언트에서 공통으로 사용
// ==============================

import { z } from 'zod';
import { paginationSchema, sortOrderSchema, idSchema } from '../base';

// ===================================
// 📚 강의 관련 Enum 정의
// ===================================

export enum CourseStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum CourseLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum ChapterType {
  TEXT = 'Text',
  VIDEO = 'Video',
  QUIZ = 'Quiz',
}

// ===================================
// 🔍 기본 강의 스키마들
// ===================================

// 강의 생성 스키마
export const createCourseSchema = z
  .object({
    title: z
      .string()
      .min(1, '강의 제목은 필수입니다')
      .max(200, '제목은 200자를 초과할 수 없습니다'),
    description: z
      .string()
      .max(2000, '설명은 2000자를 초과할 수 없습니다')
      .optional(),
    category: z
      .string()
      .min(1, '카테고리는 필수입니다')
      .max(100, '카테고리는 100자를 초과할 수 없습니다'),
    level: z.nativeEnum(CourseLevel),
    price: z
      .number()
      .min(0, '가격은 0 이상이어야 합니다')
      .max(1000000, '가격은 1,000,000원을 초과할 수 없습니다')
      .optional(),
    image: z.string().url('올바른 이미지 URL이 아닙니다').optional(),
    status: z.nativeEnum(CourseStatus).default(CourseStatus.DRAFT),
    teacherId: idSchema,
  })
  .strict();

// 강의 업데이트 스키마 (일반)
export const updateCourseSchema = z
  .object({
    title: z
      .string()
      .min(1, '강의 제목은 필수입니다')
      .max(200, '제목은 200자를 초과할 수 없습니다')
      .optional(),
    description: z
      .string()
      .max(2000, '설명은 2000자를 초과할 수 없습니다')
      .optional(),
    category: z
      .string()
      .min(1, '카테고리는 필수입니다')
      .max(100, '카테고리는 100자를 초과할 수 없습니다')
      .optional(),
    level: z.nativeEnum(CourseLevel).optional(),
    price: z
      .number()
      .min(0, '가격은 0 이상이어야 합니다')
      .max(1000000, '가격은 1,000,000원을 초과할 수 없습니다')
      .optional(),
    image: z.string().url('올바른 이미지 URL이 아닙니다').optional(),
    status: z.nativeEnum(CourseStatus).optional(),
  })
  .strict();

// FormData 전용 업데이트 스키마 (웹에서 사용)
export const updateCourseFormDataSchema = z
  .object({
    courseTitle: z
      .string()
      .min(1, '강의 제목은 필수입니다')
      .max(200, '제목은 200자를 초과할 수 없습니다')
      .optional(),
    courseDescription: z
      .string()
      .max(2000, '설명은 2000자를 초과할 수 없습니다')
      .optional(),
    courseCategory: z
      .string()
      .min(1, '카테고리는 필수입니다')
      .max(100, '카테고리는 100자를 초과할 수 없습니다')
      .optional(),
    coursePrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(
        z
          .number()
          .min(0, '가격은 0 이상이어야 합니다')
          .max(1000000, '가격은 1,000,000원을 초과할 수 없습니다')
          .optional()
      ),
    courseStatus: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  })
  .strict();

// 강의 검색 쿼리 스키마
export const courseQuerySchema = paginationSchema
  .extend({
    search: z
      .string()
      .max(100, '검색어는 100자를 초과할 수 없습니다')
      .optional(),
    category: z
      .string()
      .max(100, '카테고리는 100자를 초과할 수 없습니다')
      .optional(),
    level: z.nativeEnum(CourseLevel).optional(),
    status: z.nativeEnum(CourseStatus).optional(),
    minPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(z.number().min(0, '최소 가격은 0 이상이어야 합니다').optional()),
    maxPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(z.number().min(0, '최대 가격은 0 이상이어야 합니다').optional()),
    teacherId: idSchema.optional(),
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'title', 'price', 'enrollments'])
      .default('createdAt'),
    sortOrder: sortOrderSchema,
  })
  .strict();

// 섹션 스키마
export const sectionSchema = z
  .object({
    sectionId: idSchema,
    sectionTitle: z
      .string()
      .min(1, '섹션 제목은 필수입니다')
      .max(200, '섹션 제목은 200자를 초과할 수 없습니다'),
    sectionDescription: z
      .string()
      .max(500, '섹션 설명은 500자를 초과할 수 없습니다')
      .optional(),
    order: z.number().int().min(0, '순서는 0 이상이어야 합니다'),
    chapters: z.array(z.any()).default([]), // 순환 참조 방지를 위해 any 사용
  })
  .strict();

// 챕터 스키마
export const chapterSchema = z
  .object({
    chapterId: idSchema,
    title: z
      .string()
      .min(1, '챕터 제목은 필수입니다')
      .max(200, '챕터 제목은 200자를 초과할 수 없습니다'),
    content: z
      .string()
      .max(10000, '챕터 내용은 10,000자를 초과할 수 없습니다')
      .optional(),
    video: z.string().url('올바른 비디오 URL이 아닙니다').optional(),
    type: z.nativeEnum(ChapterType),
    order: z.number().int().min(0, '순서는 0 이상이어야 합니다'),
    freePreview: z.boolean().default(false),
    duration: z.number().min(0, '재생 시간은 0 이상이어야 합니다').optional(),
  })
  .strict();

// 비디오 업로드 URL 스키마 (API 전용)
export const uploadVideoUrlSchema = z
  .object({
    fileName: z.string().min(1, '파일명은 필수입니다'),
    fileType: z.string().min(1, '파일 타입은 필수입니다'),
  })
  .strict();

// ===================================
// 📝 TypeScript 타입 추출
// ===================================

export type CreateCourseDto = z.infer<typeof createCourseSchema>;
export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;
export type UpdateCourseFormDataDto = z.infer<
  typeof updateCourseFormDataSchema
>;
export type CourseQueryDto = z.infer<typeof courseQuerySchema>;
export type SectionDto = z.infer<typeof sectionSchema>;
export type ChapterDto = z.infer<typeof chapterSchema>;
export type UploadVideoUrlDto = z.infer<typeof uploadVideoUrlSchema>;

// ===================================
// 🏗️ 인터페이스 정의
// ===================================

// 완전한 강의 정보 인터페이스
export interface Course {
  courseId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description?: string;
  category: string;
  image?: string;
  price?: number; // 원 단위 (예: 49000)
  level: CourseLevel;
  status: CourseStatus;
  sections: Section[];
  enrollments?: Array<{
    userId: string;
  }>;
  createdAt: string;
  updatedAt: string;

  // 계산된 필드들
  totalEnrollments?: number;
  totalDuration?: number; // 분 단위
  totalChapters?: number;
}

// 섹션 인터페이스
export interface Section {
  sectionId: string;
  sectionTitle: string;
  sectionDescription?: string;
  order: number;
  chapters: Chapter[];
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

// 챕터 인터페이스
export interface Chapter {
  chapterId: string;
  title: string;
  content?: string;
  video?: string;
  type: ChapterType;
  order: number;
  freePreview: boolean;
  duration?: number; // 분 단위
  sectionId: string;
  createdAt: string;
  updatedAt: string;
}

// API 응답 인터페이스들
export interface CourseResponse {
  message: string;
  data: Course;
}

export interface UploadVideoResponse {
  message: string;
  data: {
    uploadUrl: string;
    videoUrl: string;
  };
}

// 강의 통계 인터페이스
export interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  averagePrice: number;
  totalRevenue: number;
  popularCategories: Array<{
    category: string;
    count: number;
  }>;
  levelDistribution: {
    [key in CourseLevel]: number;
  };
}

// ===================================
// 🔧 유틸리티 함수들
// ===================================

// 강의 필터 생성 함수
export function createCourseFilter(query: CourseQueryDto) {
  const filter: any = {};

  // 검색어 처리 (제목, 설명, 카테고리에서 검색)
  if (query.search) {
    filter.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // 개별 필드 필터
  if (query.category) {
    filter.category = { contains: query.category, mode: 'insensitive' };
  }

  if (query.level) {
    filter.level = query.level;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.teacherId) {
    filter.teacherId = query.teacherId;
  }

  // 가격 범위 필터
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) {
      filter.price.gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      filter.price.lte = query.maxPrice;
    }
  }

  return filter;
}

// 정렬 옵션 생성 함수
export function createCourseOrderBy(query: CourseQueryDto) {
  return {
    [query.sortBy]: query.sortOrder,
  };
}

// 강의 통계 계산 함수
export function calculateCourseStats(courses: Course[]): CourseStats {
  const total = courses.length;
  const published = courses.filter(
    (course) => course.status === CourseStatus.PUBLISHED
  ).length;
  const draft = courses.filter(
    (course) => course.status === CourseStatus.DRAFT
  ).length;

  const totalEnrollments = courses.reduce(
    (sum, course) => sum + (course.enrollments?.length || 0),
    0
  );

  const prices = courses
    .filter((course) => course.price !== undefined)
    .map((course) => course.price!);
  const averagePrice =
    prices.length > 0
      ? Math.round(
          prices.reduce((sum, price) => sum + price, 0) / prices.length
        )
      : 0;
  const totalRevenue = prices.reduce((sum, price) => sum + price, 0);

  // 카테고리별 통계
  const categoryCount: Record<string, number> = {};
  courses.forEach((course) => {
    categoryCount[course.category] = (categoryCount[course.category] || 0) + 1;
  });

  const popularCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 레벨별 분포
  const levelDistribution = {
    [CourseLevel.BEGINNER]: courses.filter(
      (c) => c.level === CourseLevel.BEGINNER
    ).length,
    [CourseLevel.INTERMEDIATE]: courses.filter(
      (c) => c.level === CourseLevel.INTERMEDIATE
    ).length,
    [CourseLevel.ADVANCED]: courses.filter(
      (c) => c.level === CourseLevel.ADVANCED
    ).length,
  };

  return {
    totalCourses: total,
    publishedCourses: published,
    draftCourses: draft,
    totalEnrollments,
    averagePrice,
    totalRevenue,
    popularCategories,
    levelDistribution,
  };
}

// 강의 검색 쿼리 검증 함수
export function validateCourseQuery(query: any): CourseQueryDto {
  const result = courseQuerySchema.safeParse(query);
  if (!result.success) {
    throw new Error(
      `잘못된 강의 검색 쿼리: ${result.error.errors.map((e) => e.message).join(', ')}`
    );
  }
  return result.data;
}

// 강의 권한 확인 함수
export function canManageCourse(
  currentUserId: string,
  courseTeacherId: string,
  userRole: string
): boolean {
  // 관리자는 모든 강의를 관리할 수 있음
  if (userRole === 'ADMIN') {
    return true;
  }

  // 강사는 자신의 강의만 관리할 수 있음
  if (userRole === 'INSTRUCTOR' && currentUserId === courseTeacherId) {
    return true;
  }

  return false;
}

// 강의 가격 포맷팅 함수
export function formatCoursePrice(price?: number): string {
  if (!price || price === 0) {
    return '무료';
  }

  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(price);
}

// 강의 레벨 한국어 변환 함수
export function getCourseLevelText(level: CourseLevel): string {
  const levelMap = {
    [CourseLevel.BEGINNER]: '초급',
    [CourseLevel.INTERMEDIATE]: '중급',
    [CourseLevel.ADVANCED]: '고급',
  };

  return levelMap[level];
}

// 강의 상태 한국어 변환 함수
export function getCourseStatusText(status: CourseStatus): string {
  const statusMap = {
    [CourseStatus.DRAFT]: '작성 중',
    [CourseStatus.PUBLISHED]: '게시됨',
  };

  return statusMap[status];
}

// 챕터 타입 한국어 변환 함수
export function getChapterTypeText(type: ChapterType): string {
  const typeMap = {
    [ChapterType.TEXT]: '텍스트',
    [ChapterType.VIDEO]: '비디오',
    [ChapterType.QUIZ]: '퀴즈',
  };

  return typeMap[type];
}

export const courseLevelSchema = z.enum(
  ['Beginner', 'Intermediate', 'Advanced'],
  {
    errorMap: () => ({
      message:
        '강의 레벨은 Beginner, Intermediate, Advanced 중 하나여야 합니다',
    }),
  }
);

export const chapterTypeSchema = z.enum(['Text', 'Video', 'Quiz'], {
  errorMap: () => ({
    message: '챕터 타입은 Text, Video, Quiz 중 하나여야 합니다',
  }),
});
