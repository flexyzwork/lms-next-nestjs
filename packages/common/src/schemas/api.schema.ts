import { z } from 'zod';
import { uuidSchema } from './base.schema';

// ==== 기본 스키마 ====
// uuidSchema는 base.schema.ts에서 가져와서 UUID와 CUID 모두 지원
export const emailSchema = z.string().email();

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
});

// ==== 강의 관련 스키마 ====
export const courseStatusSchema = z.enum(['Draft', 'Published']);
export const courseLevelSchema = z.enum(['Beginner', 'Intermediate', 'Advanced']);
export const chapterTypeSchema = z.enum(['Text', 'Video', 'Quiz']);

export const createCourseSchema = z.object({
  teacherId: z.string().uuid('올바른 교사 ID를 입력해주세요'),
  teacherName: z.string().min(1, '교사명은 필수입니다'),
});

export const updateCourseSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0, '가격은 0 이상이어야 합니다').optional(),
  level: courseLevelSchema.optional(),
  status: courseStatusSchema.optional(),
  sections: z.array(z.object({
    sectionId: z.string().optional(),
    sectionTitle: z.string(),
    sectionDescription: z.string().optional(),
    chapters: z.array(z.object({
      chapterId: z.string().optional(),
      type: chapterTypeSchema,
      title: z.string(),
      content: z.string().optional(),
      video: z.string().optional(),
    })).optional(),
  })).optional(),
});

export const courseQuerySchema = z.object({
  category: z.string().optional(),
});

// ==== 결제 관련 스키마 ====
export const paymentProviderSchema = z.enum(['stripe', 'paypal', 'kakao_pay']);

export const createStripePaymentIntentSchema = z.object({
  amount: z.number().min(1, '결제 금액은 1원 이상이어야 합니다'),
});

export const createTransactionSchema = z.object({
  userId: z.string().uuid('올바른 사용자 ID를 입력해주세요'),
  courseId: z.string().uuid('올바른 강의 ID를 입력해주세요'),
  transactionId: z.string().min(1, '트랜잭션 ID는 필수입니다'),
  amount: z.number().min(0, '금액은 0 이상이어야 합니다'),
  paymentProvider: paymentProviderSchema,
});

export const transactionQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
});

// ==== 학습 진도 관련 스키마 ====
export const chapterProgressSchema = z.object({
  chapterId: z.string().uuid('올바른 챕터 ID를 입력해주세요'),
  completed: z.boolean(),
});

export const sectionProgressSchema = z.object({
  sectionId: z.string().uuid('올바른 섹션 ID를 입력해주세요'),
  chapters: z.array(chapterProgressSchema),
});

export const updateUserCourseProgressSchema = z.object({
  sections: z.array(sectionProgressSchema).optional(),
  overallProgress: z.number().min(0).max(100).optional(),
});

// ==== 인증 관련 스키마 ====
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  username: z.string().min(2, '사용자명은 최소 2자 이상이어야 합니다'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// ==== 타입 추론 ====
export type UuidType = z.infer<typeof uuidSchema>;
export type EmailType = z.infer<typeof emailSchema>;
export type PaginationType = z.infer<typeof paginationSchema>;

export type CreateCourseDto = z.infer<typeof createCourseSchema>;
export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;
export type CourseQueryDto = z.infer<typeof courseQuerySchema>;

export type CreateStripePaymentIntentDto = z.infer<typeof createStripePaymentIntentSchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type TransactionQueryDto = z.infer<typeof transactionQuerySchema>;

export type ChapterProgressDto = z.infer<typeof chapterProgressSchema>;
export type SectionProgressDto = z.infer<typeof sectionProgressSchema>;
export type UpdateUserCourseProgressDto = z.infer<typeof updateUserCourseProgressSchema>;

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
