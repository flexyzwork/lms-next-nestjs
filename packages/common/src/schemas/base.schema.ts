import { z } from 'zod';

// 기본 검증 스키마들
// CUID와 UUID 모두 지원하는 ID 스키마
export const uuidSchema = z.string().refine(
  (val) => {
    // UUID 형식 체크
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // CUID 형식 체크 (c로 시작하는 25자)
    const cuidRegex = /^c[a-z0-9]{24}$/;
    return uuidRegex.test(val) || cuidRegex.test(val);
  },
  { message: '올바른 ID 형식이 아닙니다 (UUID 또는 CUID)' }
);

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, '페이지는 1 이상이어야 합니다')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100, '한 페이지당 최대 100개까지 조회할 수 있습니다')),
});

export const timestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const softDeleteSchema = z.object({
  deletedAt: z.date().nullable().optional(),
});

// 정렬 스키마
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// 날짜 범위 스키마
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: '시작 날짜는 종료 날짜보다 이전이어야 합니다',
  path: ['startDate'],
});

// API 응답 스키마
export const successResponseSchema = z.object({
  success: z.boolean().default(true),
  message: z.string().optional(),
  data: z.any().optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});

export const errorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});

export const paginatedResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.object({
    items: z.array(z.any()),
    pagination: z.object({
      currentPage: z.number().int(),
      totalPages: z.number().int(),
      totalItems: z.number().int(),
      itemsPerPage: z.number().int(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  }),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});

// TypeScript 타입 추출
export type PaginationDto = z.infer<typeof paginationSchema>;
export type DateRangeDto = z.infer<typeof dateRangeSchema>;
export type SuccessResponse<T = any> = {
  success: true;
  message?: string;
  data?: T;
  timestamp: string;
};
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type PaginatedResponse<T = any> = {
  success: true;
  data: {
    items: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  timestamp: string;
};
