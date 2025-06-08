import { z } from 'zod';

// 🆔 CUID2 전용 ID 스키마 (24자 고정)
export const idSchema = z.string().refine(
  (val) => {
    if (!val || typeof val !== 'string') return false;
    if (val.length !== 24) return false;
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

// 별칭
export const cuid2Schema = idSchema;

// 페이지네이션 스키마
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

// TypeScript 타입 추출
export type PaginationDto = z.infer<typeof paginationSchema>;
export type DateRangeDto = z.infer<typeof dateRangeSchema>;
export type Cuid2 = string;
