import { z } from 'zod';
import { paginationSchema, sortOrderSchema } from '@packages/common';

// 기본 사용자 정보 스키마
export const createUserSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  username: z.string().min(3, '사용자명은 최소 3자 이상이어야 합니다').optional(),
  firstName: z.string().max(50, '이름은 50자를 초과할 수 없습니다').optional(),
  lastName: z.string().max(50, '성은 50자를 초과할 수 없습니다').optional(),
});

export const updateUserSchema = z.object({
  username: z.string().min(3, '사용자명은 최소 3자 이상이어야 합니다').optional(),
  firstName: z.string().max(50, '이름은 50자를 초과할 수 없습니다').optional(),
  lastName: z.string().max(50, '성은 50자를 초과할 수 없습니다').optional(),
  avatar: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다').optional(),
}).strict(); // strict() 제거하여 빈 객체 허용

// 프로필 업데이트 스키마
export const updateProfileSchema = z.object({
  bio: z.string().max(500, '자기소개는 500자를 초과할 수 없습니다').optional(),
  location: z.string().max(100, '위치는 100자를 초과할 수 없습니다').optional(),
  website: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  dateOfBirth: z.string().date('올바른 날짜 형식이 아닙니다').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, '올바른 전화번호 형식이 아닙니다').optional(),
});

// 설정 업데이트 스키마
export const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.enum(['ko', 'en']).optional(),
  timezone: z.string().min(1, '시간대를 입력해주세요').optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
}).strict();

// 사용자 검색 쿼리 스키마
export const userSearchQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  email: z.string().optional(),
  username: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform((val) => val ? val === 'true' : undefined),
  isVerified: z.enum(['true', 'false']).optional().transform((val) => val ? val === 'true' : undefined),
  sortBy: z.enum(['createdAt', 'lastLoginAt', 'email', 'username']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

// 계정 삭제 스키마
export const deleteAccountSchema = z.object({
  password: z.string().min(1, '비밀번호를 입력해주세요'),
  confirmText: z.string().refine((val) => val === 'DELETE', {
    message: 'DELETE를 정확히 입력해주세요',
  }),
});

// TypeScript 타입 추출
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;

// 사용자 응답 변환 함수
export function transformUserResponse(user: any) {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// 사용자 필터 생성 함수
export function createUserFilter(query: UserSearchQuery) {
  const filter: any = {};

  if (query.search) {
    filter.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { username: { contains: query.search, mode: 'insensitive' } },
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.email) {
    filter.email = { contains: query.email, mode: 'insensitive' };
  }

  if (query.username) {
    filter.username = { contains: query.username, mode: 'insensitive' };
  }

  // undefined가 아닌 경우에만 필터에 추가
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  if (query.isVerified !== undefined) {
    filter.isVerified = query.isVerified;
  }

  return filter;
}

// 정렬 옵션 생성 함수
export function createUserOrderBy(query: UserSearchQuery) {
  return {
    [query.sortBy]: query.sortOrder,
  };
}
