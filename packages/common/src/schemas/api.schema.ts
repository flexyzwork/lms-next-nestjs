import { z } from 'zod';
import { idSchema, paginationSchema, sortOrderSchema } from './base.schema';

// ==== 강의 관련 스키마 ====
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
  sections: z.array(z.object({
    sectionId: idSchema.optional(),
    sectionTitle: z.string().min(1, '섹션 제목은 필수입니다').max(200, '섹션 제목은 200자를 초과할 수 없습니다'),
    sectionDescription: z.string().max(1000, '섹션 설명은 1000자를 초과할 수 없습니다').optional(),
    chapters: z.array(z.object({
      chapterId: idSchema.optional(),
      type: chapterTypeSchema,
      title: z.string().min(1, '챕터 제목은 필수입니다').max(200, '챕터 제목은 200자를 초과할 수 없습니다'),
      content: z.string().max(10000, '챕터 내용은 10000자를 초과할 수 없습니다').optional(),
      video: z.string().url('올바른 비디오 URL 형식이 아닙니다').optional(),
    })).optional(),
  })).optional(),
}).strict();

// FormData로 전송되는 데이터를 위한 스키마 (파일 업로드 등)
export const updateCourseFormDataSchema = z.object({
  title: z.string().min(1, '강의 제목은 필수입니다').max(200, '강의 제목은 200자를 초과할 수 없습니다').optional(),
  description: z.string().min(10, '강의 설명은 최소 10자 이상이어야 합니다').max(2000, '강의 설명은 2000자를 초과할 수 없습니다').optional(),
  category: z.string().min(1, '카테고리는 필수입니다').max(50, '카테고리는 50자를 초과할 수 없습니다').optional(),
  price: z.string().transform((val) => {
    if (!val) return undefined;
    const num = parseFloat(val);
    if (isNaN(num)) throw new Error('유효한 숫자가 아닙니다');
    if (num < 0) throw new Error('가격은 0 이상이어야 합니다');
    if (num > 1000000) throw new Error('가격은 100만원을 초과할 수 없습니다');
    return num;
  }).optional(),
  level: z.string().refine((val) => {
    if (!val) return true;
    return ['Beginner', 'Intermediate', 'Advanced'].includes(val);
  }, '유효한 레벨이 아닙니다').optional(),
  status: z.string().refine((val) => {
    if (!val) return true;
    return ['Draft', 'Published'].includes(val);
  }, '유효한 상태가 아닙니다').optional(),
  sections: z.string().transform((val) => {
    if (!val) return undefined;
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) {
        throw new Error('섹션은 배열이어야 합니다');
      }
      return parsed;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      throw new Error('섹션 데이터를 파싱할 수 없습니다: ' + errorMessage);
    }
  }).optional(),
}).strict();

// 강의 검색 쿼리 스키마
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

// ==== 결제 관련 스키마 ====
export const paymentProviderSchema = z.enum(['stripe', 'paypal', 'kakao_pay'], {
  errorMap: () => ({ message: '결제 제공자는 stripe, paypal, kakao_pay 중 하나여야 합니다' })
});

export const createStripePaymentIntentSchema = z.object({
  amount: z.number().min(100, '결제 금액은 100원 이상이어야 합니다').max(1000000, '결제 금액은 100만원을 초과할 수 없습니다'),
  courseId: idSchema,
  currency: z.string().default('krw'),
}).strict();

export const createTransactionSchema = z.object({
  userId: idSchema,
  courseId: idSchema,
  transactionId: z.string().min(1, '트랜잭션 ID는 필수입니다').max(100, '트랜잭션 ID는 100자를 초과할 수 없습니다'),
  amount: z.number().min(0, '금액은 0 이상이어야 합니다').max(1000000, '금액은 100만원을 초과할 수 없습니다'),
  paymentProvider: paymentProviderSchema,
  paymentMethodId: z.string().optional(),
  description: z.string().max(500, '설명은 500자를 초과할 수 없습니다').optional(),
}).strict();

export const transactionQuerySchema = paginationSchema.extend({
  userId: idSchema.optional(),
  courseId: idSchema.optional(),
  paymentProvider: paymentProviderSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.string().optional().transform((val) => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return undefined;
    return num;
  }),
  maxAmount: z.string().optional().transform((val) => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return undefined;
    return num;
  }),
  sortBy: z.enum(['dateTime', 'amount']).default('dateTime'),
  sortOrder: sortOrderSchema,
}).strict();

// ==== 학습 진도 관련 스키마 ====
export const chapterProgressSchema = z.object({
  chapterId: idSchema,
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
  timeSpent: z.number().min(0, '학습 시간은 0 이상이어야 합니다').optional(), // 초 단위
}).strict();

export const sectionProgressSchema = z.object({
  sectionId: idSchema,
  chapters: z.array(chapterProgressSchema),
  completedChapters: z.number().min(0, '완료한 챕터 수는 0 이상이어야 합니다').optional(),
  totalChapters: z.number().min(0, '전체 챕터 수는 0 이상이어야 합니다').optional(),
}).strict();

export const updateUserCourseProgressSchema = z.object({
  sections: z.array(sectionProgressSchema).optional(),
  overallProgress: z.number().min(0, '전체 진도는 0 이상이어야 합니다').max(100, '전체 진도는 100을 초과할 수 없습니다').optional(),
  lastAccessedChapterId: idSchema.optional(),
}).strict();

// ==== 댓글 관련 스키마 ====
export const createCommentSchema = z.object({
  chapterId: idSchema,
  text: z.string().min(1, '댓글 내용은 필수입니다').max(1000, '댓글은 1000자를 초과할 수 없습니다'),
  parentId: idSchema.optional(), // 대댓글용
}).strict();

export const updateCommentSchema = z.object({
  text: z.string().min(1, '댓글 내용은 필수입니다').max(1000, '댓글은 1000자를 초과할 수 없습니다'),
}).strict();

export const commentQuerySchema = paginationSchema.extend({
  chapterId: idSchema.optional(),
  userId: idSchema.optional(),
  parentId: idSchema.optional(),
  sortBy: z.enum(['timestamp', 'createdAt']).default('timestamp'),
  sortOrder: sortOrderSchema,
}).strict();

// ==== 등록 관련 스키마 ====
export const createEnrollmentSchema = z.object({
  courseId: idSchema,
  paymentMethod: paymentProviderSchema.optional(),
}).strict();

export const enrollmentQuerySchema = paginationSchema.extend({
  userId: idSchema.optional(),
  courseId: idSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['enrolledAt', 'createdAt']).default('enrolledAt'),
  sortOrder: sortOrderSchema,
}).strict();

// ==== 사용자 관련 스키마 ====
export const userQuerySchema = paginationSchema.extend({
  search: z.string().max(100, '검색어는 100자를 초과할 수 없습니다').optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional(),
  username: z.string().max(30, '사용자명은 30자를 초과할 수 없습니다').optional(),
  role: z.enum(['USER', 'INSTRUCTOR']).optional(),
  isActive: z.enum(['true', 'false']).optional().transform((val) => val ? val === 'true' : undefined),
  isVerified: z.enum(['true', 'false']).optional().transform((val) => val ? val === 'true' : undefined),
  sortBy: z.enum(['createdAt', 'lastLoginAt', 'email', 'username']).default('createdAt'),
  sortOrder: sortOrderSchema,
}).strict();

// TypeScript 타입 추출
export type CreateCourseDto = z.infer<typeof createCourseSchema>;
export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;
export type UpdateCourseFormDataDto = z.infer<typeof updateCourseFormDataSchema>;
export type CourseQueryDto = z.infer<typeof courseQuerySchema>;

export type CreateStripePaymentIntentDto = z.infer<typeof createStripePaymentIntentSchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type TransactionQueryDto = z.infer<typeof transactionQuerySchema>;

export type ChapterProgressDto = z.infer<typeof chapterProgressSchema>;
export type SectionProgressDto = z.infer<typeof sectionProgressSchema>;
export type UpdateUserCourseProgressDto = z.infer<typeof updateUserCourseProgressSchema>;

export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;
export type CommentQueryDto = z.infer<typeof commentQuerySchema>;

export type CreateEnrollmentDto = z.infer<typeof createEnrollmentSchema>;
export type EnrollmentQueryDto = z.infer<typeof enrollmentQuerySchema>;

export type UserQueryDto = z.infer<typeof userQuerySchema>;

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
