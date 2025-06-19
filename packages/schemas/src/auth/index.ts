import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  usernameSchema,
  nameSchema,
  phoneSchema,
} from '../base';

// ==============================
// 🔐 통합 인증 스키마 (단일 소스)
// 모든 인증 관련 스키마와 타입을 여기서 관리합니다.
// ==============================

// 회원가입 스키마
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    username: usernameSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
  })
  .strict();

// 로그인 스키마
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, '비밀번호를 입력해주세요'),
  })
  .strict();

// 토큰 새로고침 스키마
export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, '리프레시 토큰을 입력해주세요'),
  })
  .strict();

// 비밀번호 변경 스키마
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

// 비밀번호 찾기 스키마
export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// 비밀번호 재설정 스키마
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, '재설정 토큰을 입력해주세요'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

// 이메일 인증 스키마
export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, '인증 토큰을 입력해주세요'),
  })
  .strict();

// 소셜 인증 콜백 스키마
export const socialAuthCallbackSchema = z
  .object({
    code: z.string().min(1, '인증 코드를 입력해주세요'),
    state: z.string().optional(),
  })
  .strict();

// 프로필 업데이트 스키마
export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    bio: z
      .string()
      .max(500, '자기소개는 500자를 초과할 수 없습니다')
      .optional(),
    location: z
      .string()
      .max(100, '위치는 100자를 초과할 수 없습니다')
      .optional(),
    website: z.string().url('올바른 URL 형식이 아닙니다').optional(),
    dateOfBirth: z
      .string()
      .date('올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)')
      .optional(),
    phone: phoneSchema.optional(),
    avatar: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  })
  .strict();

// 사용자 설정 스키마
export const updateSettingsSchema = z
  .object({
    theme: z
      .enum(['light', 'dark', 'system'], {
        errorMap: () => ({
          message: '테마는 light, dark, system 중 하나여야 합니다',
        }),
      })
      .optional(),
    language: z
      .enum(['ko', 'en'], {
        errorMap: () => ({ message: '언어는 ko, en 중 하나여야 합니다' }),
      })
      .optional(),
    timezone: z.string().min(1, '시간대를 입력해주세요').optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    twoFactorEnabled: z.boolean().optional(),
  })
  .strict();

// 계정 삭제 스키마
// export const deleteAccountSchema = z.object({
//   password: z.string().min(1, '비밀번호를 입력해주세요'),
//   confirmText: z.string().refine((val) => val === 'DELETE', {
//     message: 'DELETE를 정확히 입력해주세요',
//   }),
// }).strict();

// 비밀번호 강도 검사 스키마
export const passwordStrengthSchema = z
  .object({
    password: z.string().min(1, '비밀번호를 입력해주세요'),
  })
  .transform((data) => {
    const { password } = data;
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[@$!%*?&]/.test(password),
    };

    // 점수 계산
    if (checks.length) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.numbers) score += 1;
    if (checks.symbols) score += 1;

    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

    return {
      password,
      score,
      strength,
      checks,
      suggestions: [
        !checks.length && '최소 8자 이상 입력하세요',
        !checks.lowercase && '소문자를 포함하세요',
        !checks.uppercase && '대문자를 포함하세요',
        !checks.numbers && '숫자를 포함하세요',
        !checks.symbols && '특수문자(@$!%*?&)를 포함하세요',
      ].filter(Boolean),
    };
  });

// TypeScript 타입 추출
export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type SocialAuthCallbackDto = z.infer<typeof socialAuthCallbackSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
// export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;
export type PasswordStrengthResult = z.infer<typeof passwordStrengthSchema>;

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

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    tokens: AuthTokens;
  };
}

// 에러 타입
export interface AuthError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
    received?: string;
  }>;
}

// 토큰 페이로드 타입
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'INSTRUCTOR';
  tokenId: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// 세션 정보 타입
export interface SessionInfo {
  tokenId: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  lastUsed: string;
  createdAt: string;
}

// ==============================
// 🔧 유틸리티 함수들
// ==============================

// 사용자 응답 정제 함수
export function sanitizeUserResponse(user: any): Omit<AuthUser, 'password'> {
  const { password, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
    lastLoginAt: user.lastLoginAt?.toISOString?.() || user.lastLoginAt,
  };
}

// 비밀번호 검증 함수
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const result = passwordSchema.safeParse(password);
  return {
    isValid: result.success,
    errors: result.success ? [] : result.error.errors.map((err) => err.message),
  };
}

// 이메일 검증 함수
export function validateEmail(email: string): {
  isValid: boolean;
  errors: string[];
} {
  const result = emailSchema.safeParse(email);
  return {
    isValid: result.success,
    errors: result.success ? [] : result.error.errors.map((err) => err.message),
  };
}
