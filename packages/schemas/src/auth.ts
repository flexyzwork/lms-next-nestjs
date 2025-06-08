import { z } from 'zod';

// 기본 검증 스키마들
export const emailSchema = z
  .string()
  .min(1, '이메일을 입력해주세요')
  .email('올바른 이메일 형식이 아닙니다')
  .max(255, '이메일은 255자를 초과할 수 없습니다')
  .transform((email) => email.toLowerCase().trim());

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
  .transform((username) => username.toLowerCase().trim());

export const nameSchema = z
  .string()
  .min(1, '이름을 입력해주세요')
  .max(50, '이름은 50자를 초과할 수 없습니다')
  .regex(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문, 공백만 사용할 수 있습니다')
  .transform((name) => name.trim());

export const phoneSchema = z
  .string()
  .regex(
    /^(\+82|0)?(10|11|16|17|18|19)\d{8}$/,
    '올바른 한국 휴대폰 번호 형식이 아닙니다 (예: 010-1234-5678)'
  )
  .transform((phone) => phone.replace(/[^0-9+]/g, ''));

// 로그인 스키마
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
}).strict();

// 회원가입 스키마
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
}).strict();

// 비밀번호 변경 스키마
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).strict().refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

// 비밀번호 찾기 스키마
export const forgotPasswordSchema = z.object({
  email: emailSchema,
}).strict();

// 비밀번호 재설정 스키마
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '재설정 토큰을 입력해주세요'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).strict().refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

// 프로필 업데이트 스키마
export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  bio: z.string().max(500, '자기소개는 500자를 초과할 수 없습니다').optional(),
  location: z.string().max(100, '위치는 100자를 초과할 수 없습니다').optional(),
  website: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  dateOfBirth: z.string().date('올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)').optional(),
  phone: phoneSchema.optional(),
  avatar: z.string().url('올바른 URL 형식이 아닙니다').optional(),
}).strict();

// TypeScript 타입 추출
export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

// 인증 응답 타입들 (클라이언트용)
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'USER' | 'INSTRUCTOR';
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: AuthUser;
  message: string;
}
