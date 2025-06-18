// ==============================
// 🔐 Auth 패키지 독립적 스키마 정의
// 순환 의존성 방지를 위해 독립적으로 정의
// ==============================

import { z } from 'zod';

// ==============================
// 기본 검증 스키마
// ==============================

export const emailSchema = z
  .string()
  .min(1, '이메일을 입력해주세요')
  .email('올바른 이메일 형식이 아닙니다')
  .max(255, '이메일이 너무 깁니다');

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .max(128, '비밀번호가 너무 깁니다')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다'
  );

export const usernameSchema = z
  .string()
  .min(2, '사용자명은 최소 2자 이상이어야 합니다')
  .max(50, '사용자명이 너무 깁니다')
  .regex(/^[a-zA-Z0-9_-]+$/, '사용자명은 영문, 숫자, _, -만 사용 가능합니다')
  .optional();

export const nameSchema = z
  .string()
  .min(1, '이름을 입력해주세요')
  .max(100, '이름이 너무 깁니다')
  .regex(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문, 공백만 사용 가능합니다');

export const phoneSchema = z
  .string()
  .regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, '올바른 휴대폰 번호를 입력해주세요')
  .optional();

// ==============================
// 인증 관련 스키마
// ==============================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
}).strict();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
  name: nameSchema.optional(),
}).strict();

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '리프레시 토큰이 필요합니다'),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: passwordSchema,
}).strict();

export const forgotPasswordSchema = z.object({
  email: emailSchema,
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(1, '토큰이 필요합니다'),
  newPassword: passwordSchema,
}).strict();

export const verifyEmailSchema = z.object({
  token: z.string().min(1, '인증 토큰이 필요합니다'),
}).strict();

export const socialAuthCallbackSchema = z.object({
  code: z.string().min(1, '인증 코드가 필요합니다'),
  state: z.string().optional(),
}).strict();

export const updateProfileSchema = z.object({
  username: usernameSchema,
  name: nameSchema.optional(),
  phone: phoneSchema,
}).strict();

export const updateSettingsSchema = z.object({
  notifications: z.boolean().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  language: z.enum(['ko', 'en']).optional(),
}).strict();

export const deleteAccountSchema = z.object({
  password: z.string().min(1, '비밀번호를 입력해주세요'),
  confirmText: z.literal('DELETE', {
    errorMap: () => ({ message: 'DELETE를 정확히 입력해주세요' }),
  }),
}).strict();

export const passwordStrengthSchema = z.object({
  password: z.string(),
}).strict();

// ==============================
// 타입 정의
// ==============================

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type SocialAuthCallbackDto = z.infer<typeof socialAuthCallbackSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;

// ==============================
// 인증 응답 타입들
// ==============================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface LoginResponse extends AuthResponse {
  data: {
    user: AuthUser;
    tokens: AuthTokens;
  };
}

export interface RegisterResponse extends AuthResponse {
  data: {
    user: AuthUser;
    tokens: AuthTokens;
  };
}

export interface AuthError {
  message: string;
  code: string;
  statusCode: number;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastAccessedAt: string;
}

export interface PasswordStrengthResult {
  score: number; // 0-4
  feedback: string[];
  isStrong: boolean;
}

// ==============================
// 유틸리티 함수들
// ==============================

export function sanitizeUserResponse(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function validatePassword(password: string): boolean {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}