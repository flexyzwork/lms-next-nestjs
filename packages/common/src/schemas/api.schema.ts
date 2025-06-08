import { z } from 'zod';
import { idSchema } from './base.schema';

// ==== 기본 스키마 ====
// 🆔 모든 ID는 CUID2 사용
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

// UUID와 CUID 모두 지원하는 ID 스키마 - 새로운 엔티티는 cuid2Schema 사용 추천
export const createCourseSchema = z.object({
  teacherId: idSchema, // 🆔 CUID2 사용
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

// FormData로 전송되는 데이터를 위한 스키마
export const updateCourseFormDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.string().transform((val) => {
    if (!val) return undefined;
    const num = parseFloat(val);
    if (isNaN(num)) throw new Error('유효한 숫자가 아닙니다');
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
      // 각 section과 chapter에 대해 기본 검증
      if (!Array.isArray(parsed)) {
        throw new Error('섹션은 배열이어야 합니다');
      }
      return parsed;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      throw new Error('섹션 데이터를 파싱할 수 없습니다: ' + errorMessage);
    }
  }).optional(),
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
  userId: idSchema, // 🆔 CUID2 사용
  courseId: idSchema, // 🆔 CUID2 사용
  transactionId: z.string().min(1, '트랜잭션 ID는 필수입니다'),
  amount: z.number().min(0, '금액은 0 이상이어야 합니다'),
  paymentProvider: paymentProviderSchema,
});

export const transactionQuerySchema = z.object({
  userId: idSchema.optional(), // 🆔 CUID2 사용
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
});

// ==== 학습 진도 관련 스키마 ====
export const chapterProgressSchema = z.object({
  chapterId: idSchema, // 🆔 CUID2 사용
  completed: z.boolean(),
});

export const sectionProgressSchema = z.object({
  sectionId: idSchema, // 🆔 CUID2 사용
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
export type EmailType = z.infer<typeof emailSchema>;
export type PaginationType = z.infer<typeof paginationSchema>;

export type CreateCourseDto = z.infer<typeof createCourseSchema>;
export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;
export type UpdateCourseFormDataDto = z.infer<typeof updateCourseFormDataSchema>; // 🆕 FormData 전용 타입
export type CourseQueryDto = z.infer<typeof courseQuerySchema>;

export type CreateStripePaymentIntentDto = z.infer<typeof createStripePaymentIntentSchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type TransactionQueryDto = z.infer<typeof transactionQuerySchema>;

export type ChapterProgressDto = z.infer<typeof chapterProgressSchema>;
export type SectionProgressDto = z.infer<typeof sectionProgressSchema>;
export type UpdateUserCourseProgressDto = z.infer<typeof updateUserCourseProgressSchema>;

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
