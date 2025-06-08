import { z } from 'zod';
import { idSchema, paginationSchema, sortOrderSchema } from './base';

// ==============================
// 🎓 API 스키마들 (기존 common 패키지에서 이전)
// ==============================

// 강의 관련 enum 스키마
export const courseStatusSchema = z.enum(['Draft', 'Published'], {
  errorMap: () => ({ message: '강의 상태는 Draft 또는 Published여야 합니다' })
});

export const courseLevelSchema = z.enum(['Beginner', 'Intermediate', 'Advanced'], {
  errorMap: () => ({ message: '강의 레벨은 Beginner, Intermediate, Advanced 중 하나여야 합니다' })
});

export const chapterTypeSchema = z.enum(['Text', 'Video', 'Quiz'], {
  errorMap: () => ({ message: '챕터 타입은 Text, Video, Quiz 중 하나여야 합니다' })
});

// 강의 생성 스키마
export const createCourseSchema = z.object({
  teacherId: idSchema,
  teacherName: z.string().min(1, '교사명은 필수입니다').max(100, '교사명은 100자를 초과할 수 없습니다'),
  title: z.string().min(1, '강의 제목은 필수입니다').max(200, '강의 제목은 200자를 초과할 수 없습니다'),
  description: z.string().min(10, '강의 설명은 최소 10자 이상이어야 합니다').max(2000, '강의 설명은 2000자를 초과할 수 없습니다').optional(),
  category: z.string().min(1, '카테고리는 필수입니다').max(50, '카테고리는 50자를 초과할 수 없습니다'),
  price: z.number().min(0, '가격은 0 이상이어야 합니다').max(1000000, '가격은 100만원을 초과할 수 없습니다').optional(),
  level: courseLevelSchema,
  status: courseStatusSchema.default('Draft'),
  image: z.string().url('올바른 이미지 URL 형식이 아닙니다').optional(),
}).strict();

// 강의 업데이트 스키마
export const updateCourseSchema = z.object({
  title: z.string().min(1, '강의 제목은 필수입니다').max(200, '강의 제목은 200자를 초과할 수 없습니다').optional(),
  description: z.string().min(10, '강의 설명은 최소 10자 이상이어야 합니다').max(2000, '강의 설명은 2000자를 초과할 수 없습니다').optional(),
  category: z.string().min(1, '카테고리는 필수입니다').max(50, '카테고리는 50자를 초과할 수 없습니다').optional(),
  price: z.number().min(0, '가격은 0 이상이어야 합니다').max(1000000, '가격은 100만원을 초과할 수 없습니다').optional(),
  level: courseLevelSchema.optional(),
  status: courseStatusSchema.optional(),
  image: z.string().url('올바른 이미지 URL 형식이 아닙니다').optional(),
}).strict();

// 강의 검색 쿼리 스키마 (수정된 버전)
export const courseQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  level: courseLevelSchema.optional(),
  status: courseStatusSchema.optional(),
  search: z.string().max(100, '검색어는 100자를 초과할 수 없습니다').optional(),
  teacherId: idSchema.optional(),
  minPrice: z.string().optional().transform((val) => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return undefined;
    return num;
  }),
  maxPrice: z.string().optional().transform((val) => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return undefined;
    return num;
  }),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'price']).default('createdAt'),
  sortOrder: sortOrderSchema,
}).strict();

// 결제 관련 스키마
export const paymentProviderSchema = z.enum(['stripe', 'paypal', 'kakao_pay'], {
  errorMap: () => ({ message: '결제 제공자는 stripe, paypal, kakao_pay 중 하나여야 합니다' })
});

export const createTransactionSchema = z.object({
  userId: idSchema,
  courseId: idSchema,
  transactionId: z.string().min(1, '트랜잭션 ID는 필수입니다').max(100, '트랜잭션 ID는 100자를 초과할 수 없습니다'),
  amount: z.number().min(0, '금액은 0 이상이어야 합니다').max(1000000, '금액은 100만원을 초과할 수 없습니다'),
  paymentProvider: paymentProviderSchema,
}).strict();

// 학습 진도 관련 스키마
export const chapterProgressSchema = z.object({
  chapterId: idSchema,
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
  timeSpent: z.number().min(0, '학습 시간은 0 이상이어야 합니다').optional(), // 초 단위
}).strict();

export const sectionProgressSchema = z.object({
  sectionId: idSchema,
  chapters: z.array(chapterProgressSchema),
}).strict();

export const updateUserCourseProgressSchema = z.object({
  sections: z.array(sectionProgressSchema).optional(),
  overallProgress: z.number().min(0, '전체 진도는 0 이상이어야 합니다').max(100, '전체 진도는 100을 초과할 수 없습니다').optional(),
  lastAccessedChapterId: idSchema.optional(),
}).strict();

// TypeScript 타입 추출
export type CreateCourseDto = z.infer<typeof createCourseSchema>;
export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;
export type CourseQueryDto = z.infer<typeof courseQuerySchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type ChapterProgressDto = z.infer<typeof chapterProgressSchema>;
export type SectionProgressDto = z.infer<typeof sectionProgressSchema>;
export type UpdateUserCourseProgressDto = z.infer<typeof updateUserCourseProgressSchema>;

// 유틸리티 함수들
export function validateCoursePrice(price: number): boolean {
  return price >= 0 && price <= 1000000;
}

export function calculateCourseProgress(sections: SectionProgressDto[]): number {
  if (!sections.length) return 0;
  
  const totalChapters = sections.reduce((sum, section) => sum + section.chapters.length, 0);
  const completedChapters = sections.reduce((sum, section) => 
    sum + section.chapters.filter(chapter => chapter.completed).length, 0
  );
  
  return totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
}

export function sanitizeCourseQuery(query: any): CourseQueryDto {
  const result = courseQuerySchema.safeParse(query);
  if (!result.success) {
    throw new Error(`Invalid course query: ${result.error.errors.map(e => e.message).join(', ')}`);
  }
  return result.data;
}
