import { z } from 'zod';
import { idSchema, paginationSchema, sortOrderSchema } from './base';

// 강의 관련 enum 스키마
export const courseStatusSchema = z.enum(['Draft', 'Published']);
export const courseLevelSchema = z.enum(['Beginner', 'Intermediate', 'Advanced']);
export const chapterTypeSchema = z.enum(['Text', 'Video', 'Quiz']);

// 강의 생성 스키마
export const createCourseSchema = z.object({
  teacherId: idSchema,
  teacherName: z.string().min(1, '교사명은 필수입니다').max(100),
  title: z.string().min(1, '강의 제목은 필수입니다').max(200),
  description: z.string().min(10, '강의 설명은 최소 10자 이상이어야 합니다').max(2000).optional(),
  category: z.string().min(1, '카테고리는 필수입니다').max(50),
  price: z.number().min(0, '가격은 0 이상이어야 합니다').max(1000000).optional(),
  level: courseLevelSchema,
  status: courseStatusSchema.default('Draft'),
  image: z.string().url('올바른 이미지 URL 형식이 아닙니다').optional(),
}).strict();

// 강의 업데이트 스키마
export const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  category: z.string().min(1).max(50).optional(),
  price: z.number().min(0).max(1000000).optional(),
  level: courseLevelSchema.optional(),
  status: courseStatusSchema.optional(),
  image: z.string().url().optional(),
}).strict();

// 강의 검색 쿼리 스키마
export const courseQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  level: courseLevelSchema.optional(),
  status: courseStatusSchema.optional(),
  search: z.string().max(100).optional(),
  teacherId: idSchema.optional(),
  minPrice: z.string().transform((val) => val ? parseFloat(val) : undefined).pipe(z.number().min(0).optional()),
  maxPrice: z.string().transform((val) => val ? parseFloat(val) : undefined).pipe(z.number().min(0).optional()),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'price']).default('createdAt'),
  sortOrder: sortOrderSchema,
}).strict();

// 결제 관련 스키마
export const paymentProviderSchema = z.enum(['stripe', 'paypal', 'kakao_pay']);

export const createTransactionSchema = z.object({
  userId: idSchema,
  courseId: idSchema,
  transactionId: z.string().min(1).max(100),
  amount: z.number().min(0).max(1000000),
  paymentProvider: paymentProviderSchema,
}).strict();

// 학습 진도 관련 스키마
export const chapterProgressSchema = z.object({
  chapterId: idSchema,
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
  timeSpent: z.number().min(0).optional(),
}).strict();

export const sectionProgressSchema = z.object({
  sectionId: idSchema,
  chapters: z.array(chapterProgressSchema),
}).strict();

export const updateUserCourseProgressSchema = z.object({
  sections: z.array(sectionProgressSchema).optional(),
  overallProgress: z.number().min(0).max(100).optional(),
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
