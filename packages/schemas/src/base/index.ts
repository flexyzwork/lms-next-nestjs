import { z } from 'zod';

// ==============================
// 📋 기본 스키마들 (공통)
// ==============================

// 🆔 CUID2 전용 ID 스키마 (24자 고정)
// 모든 새로운 엔티티는 CUID2 사용 필수
export const idSchema = z.string().refine(
  (val) => {
    // 기본 유효성 검사
    if (!val || typeof val !== 'string') {
      return false;
    }
    
    // 길이 우선 체크 (성능 최적화)
    if (val.length !== 24) {
      return false;
    }
    
    // CUID2 형식 검증 (24자, 첫 글자는 소문자, 나머지는 소문자+숫자)
    const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
    return cuid2Regex.test(val);
  },
  (val) => {
    if (!val || typeof val !== 'string') {
      return { message: 'ID는 문자열이어야 합니다' };
    }
    
    if (val.length !== 24) {
      return { 
        message: `ID는 정확히 24자여야 합니다 (현재: ${val.length}자, 예: yefj4way7aurp2kamr0bwr8n)`
      };
    }
    
    const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
    if (!cuid2Regex.test(val)) {
      return { 
        message: '올바른 CUID2 형식이 아닙니다 (소문자로 시작하고 소문자+숫자 24자). 예: yefj4way7aurp2kamr0bwr8n'
      };
    }
    
    return { message: '알 수 없는 ID 형식 오류' };
  }
);

// 🆔 CUID2 전용 스키마 (새 코드에서 사용 권장)
export const cuid2Schema = idSchema;

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

// 기본 검증 스키마들 - auth.ts에서도 사용
export const emailSchema = z
  .string()
  .min(1, '이메일을 입력해주세요')
  .email('올바른 이메일 형식이 아닙니다')
  .max(255, '이메일은 255자를 초과할 수 없습니다')
  .transform((email) => email.toLowerCase().trim()); // 소문자 변환 및 공백 제거

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .max(128, '비밀번호는 128자를 초과할 수 없습니다')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    '비밀번호는 대소문자, 숫자, 특수문자(@$!%*?&)를 포함해야 합니다'
  );

export const usernameSchema = z
  .string()
  .min(3, '사용자명은 최소 3자 이상이어야 합니다')
  .max(30, '사용자명은 30자를 초과할 수 없습니다')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    '사용자명은 영문, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다'
  )
  .transform((username) => username.toLowerCase().trim()); // 소문자 변환

// 이름 관련 스키마
export const nameSchema = z
  .string()
  .min(1, '이름을 입력해주세요')
  .max(50, '이름은 50자를 초과할 수 없습니다')
  .regex(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문, 공백만 사용할 수 있습니다')
  .transform((name) => name.trim());

// 전화번호 스키마 (한국 기준)
export const phoneSchema = z
  .string()
  .regex(
    /^(\+82|0)?(10|11|16|17|18|19)\d{8}$/,
    '올바른 한국 휴대폰 번호 형식이 아닙니다 (예: 010-1234-5678)'
  )
  .transform((phone) => phone.replace(/[^0-9+]/g, '')); // 숫자와 + 제외 모든 문자 제거

// TypeScript 타입 추출
export type PaginationDto = z.infer<typeof paginationSchema>;
export type DateRangeDto = z.infer<typeof dateRangeSchema>;
export type Cuid2 = string;

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
