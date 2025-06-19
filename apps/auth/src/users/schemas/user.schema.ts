import { z } from 'zod';
import { 
  paginationSchema, 
  sortOrderSchema, 
  idSchema 
} from '@packages/schemas';
import {
  emailSchema,
  usernameSchema, 
  nameSchema,
  phoneSchema,
  passwordSchema
} from '@packages/schemas';

// ===================================
// 🔒 인증 서비스 전용 스키마 (기본 스키마는 @packages/schemas 사용)
// ===================================

// 사용자 생성 스키마 (관리자용 - 더 많은 필드 포함)
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  role: z.enum(['USER', 'INSTRUCTOR']).default('USER'),
  isActive: z.boolean().default(true),
  isVerified: z.boolean().default(false),
}).strict();

// 사용자 업데이트 스키마 (관리자/사용자 공통)
export const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  avatar: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  password: passwordSchema.optional(),
  role: z.enum(['USER', 'INSTRUCTOR']).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
}).strict();

// 프로필 업데이트 스키마 (사용자 전용)
export const updateProfileSchema = z.object({
  bio: z.string().max(500, '자기소개는 500자를 초과할 수 없습니다').optional(),
  location: z.string().max(100, '위치는 100자를 초과할 수 없습니다').optional(),
  website: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  dateOfBirth: z.string().date('올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)').optional(),
  phone: phoneSchema.optional(),
}).strict();

// 설정 업데이트 스키마
export const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system'], {
    errorMap: () => ({ message: '테마는 light, dark, system 중 하나여야 합니다' })
  }).optional(),
  language: z.enum(['ko', 'en'], {
    errorMap: () => ({ message: '언어는 ko, en 중 하나여야 합니다' })
  }).optional(),
  timezone: z.string().min(1, '시간대를 입력해주세요').optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
}).strict();

// 사용자 검색 쿼리 스키마 (관리자용 - 더 많은 필터)
export const userSearchQuerySchema = paginationSchema.extend({
  search: z.string().max(100, '검색어는 100자를 초과할 수 없습니다').optional(),
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
  role: z.enum(['USER', 'INSTRUCTOR']).optional(),
  isActive: z.enum(['true', 'false']).optional().transform((val) => val ? val === 'true' : undefined),
  isVerified: z.enum(['true', 'false']).optional().transform((val) => val ? val === 'true' : undefined),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  lastLoginAfter: z.string().datetime().optional(),
  lastLoginBefore: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'lastLoginAt', 'email', 'username', 'role']).default('createdAt'),
  sortOrder: sortOrderSchema,
}).strict();

// 계정 삭제 스키마
export const deleteAccountSchema = z.object({
  password: passwordSchema,
  confirmText: z.string().refine((val) => val === 'DELETE', {
    message: 'DELETE를 정확히 입력해주세요',
  }),
  reason: z.string().max(500, '삭제 사유는 500자를 초과할 수 없습니다').optional(),
}).strict();

// 사용자 역할 변경 스키마 (관리자 전용)
export const changeUserRoleSchema = z.object({
  userId: idSchema,
  newRole: z.enum(['USER', 'INSTRUCTOR'], {
    errorMap: () => ({ message: '역할은 USER 또는 INSTRUCTOR여야 합니다' })
  }),
  reason: z.string().min(1, '역할 변경 사유는 필수입니다').max(500, '사유는 500자를 초과할 수 없습니다'),
}).strict();

// 사용자 활성화/비활성화 스키마 (관리자 전용)
export const toggleUserStatusSchema = z.object({
  userId: idSchema,
  isActive: z.boolean(),
  reason: z.string().min(1, '상태 변경 사유는 필수입니다').max(500, '사유는 500자를 초과할 수 없습니다'),
}).strict();

// 이메일 인증 재발송 스키마
export const resendVerificationSchema = z.object({
  email: emailSchema,
}).strict();

// 사용자 일괄 작업 스키마 (관리자 전용)
export const bulkUserActionSchema = z.object({
  userIds: z.array(idSchema).min(1, '최소 1명의 사용자를 선택해야 합니다').max(100, '한 번에 최대 100명까지 처리할 수 있습니다'),
  action: z.enum(['activate', 'deactivate', 'verify', 'delete'], {
    errorMap: () => ({ message: '액션은 activate, deactivate, verify, delete 중 하나여야 합니다' })
  }),
  reason: z.string().min(1, '작업 사유는 필수입니다').max(500, '사유는 500자를 초과할 수 없습니다'),
}).strict();

// TypeScript 타입 추출
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;
export type ChangeUserRoleDto = z.infer<typeof changeUserRoleSchema>;
export type ToggleUserStatusDto = z.infer<typeof toggleUserStatusSchema>;
export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
export type BulkUserActionDto = z.infer<typeof bulkUserActionSchema>;

// ===================================
// 🔧 유틸리티 함수들
// ===================================

// 사용자 응답 변환 함수 (비밀번호 제거)
export function transformUserResponse(user: any) {
  const { password, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
    lastLoginAt: user.lastLoginAt?.toISOString?.() || user.lastLoginAt,
  };
}

// 사용자 필터 생성 함수
export function createUserFilter(query: UserSearchQuery) {
  const filter: any = {};

  // 검색어 처리 (OR 조건)
  if (query.search) {
    filter.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { username: { contains: query.search, mode: 'insensitive' } },
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // 개별 필드 필터
  if (query.email) {
    filter.email = { contains: query.email, mode: 'insensitive' };
  }

  if (query.username) {
    filter.username = { contains: query.username, mode: 'insensitive' };
  }

  if (query.role) {
    filter.role = query.role;
  }

  // Boolean 필드 (undefined가 아닌 경우에만 필터에 추가)
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  if (query.isVerified !== undefined) {
    filter.isVerified = query.isVerified;
  }

  // 날짜 범위 필터
  if (query.createdAfter || query.createdBefore) {
    filter.createdAt = {};
    if (query.createdAfter) {
      filter.createdAt.gte = new Date(query.createdAfter);
    }
    if (query.createdBefore) {
      filter.createdAt.lte = new Date(query.createdBefore);
    }
  }

  if (query.lastLoginAfter || query.lastLoginBefore) {
    filter.lastLoginAt = {};
    if (query.lastLoginAfter) {
      filter.lastLoginAt.gte = new Date(query.lastLoginAfter);
    }
    if (query.lastLoginBefore) {
      filter.lastLoginAt.lte = new Date(query.lastLoginBefore);
    }
  }

  return filter;
}

// 정렬 옵션 생성 함수
export function createUserOrderBy(query: UserSearchQuery) {
  return {
    [query.sortBy]: query.sortOrder,
  };
}

// 사용자 통계 계산 함수
export function calculateUserStats(users: any[]) {
  const total = users.length;
  const active = users.filter(user => user.isActive).length;
  const verified = users.filter(user => user.isVerified).length;
  const instructors = users.filter(user => user.role === 'INSTRUCTOR').length;
  const regularUsers = users.filter(user => user.role === 'USER').length;

  return {
    total,
    active,
    inactive: total - active,
    verified,
    unverified: total - verified,
    instructors,
    regularUsers,
    activeRate: total > 0 ? Math.round((active / total) * 100) : 0,
    verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
  };
}

// 사용자 검색 쿼리 검증 함수
export function validateUserQuery(query: any): UserSearchQuery {
  const result = userSearchQuerySchema.safeParse(query);
  if (!result.success) {
    throw new Error(`잘못된 사용자 검색 쿼리: ${result.error.errors.map(e => e.message).join(', ')}`);
  }
  return result.data;
}

// 사용자 권한 확인 함수
export function canManageUser(currentUserRole: string, targetUserRole: string): boolean {
  // 관리자는 모든 사용자를 관리할 수 있음
  if (currentUserRole === 'ADMIN') {
    return true;
  }
  
  // 강사는 일반 사용자만 관리할 수 있음
  if (currentUserRole === 'INSTRUCTOR' && targetUserRole === 'USER') {
    return true;
  }
  
  return false;
}

// 안전한 사용자 업데이트 필드 필터링
export function filterSafeUpdateFields(data: UpdateUserDto, currentUserRole: string, isOwnProfile: boolean): Partial<UpdateUserDto> {
  const safeFields: Partial<UpdateUserDto> = {};
  
  // 자신의 프로필인 경우
  if (isOwnProfile) {
    safeFields.username = data.username;
    safeFields.firstName = data.firstName;
    safeFields.lastName = data.lastName;
    safeFields.avatar = data.avatar;
    safeFields.password = data.password;
  }
  
  // 관리자인 경우 모든 필드 업데이트 가능
  if (currentUserRole === 'ADMIN') {
    return data;
  }
  
  // 강사인 경우 일부 필드만 업데이트 가능
  if (currentUserRole === 'INSTRUCTOR' && !isOwnProfile) {
    safeFields.isActive = data.isActive;
    safeFields.isVerified = data.isVerified;
  }
  
  return safeFields;
}
