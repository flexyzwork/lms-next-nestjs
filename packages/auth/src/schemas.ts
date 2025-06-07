import { z } from 'zod';

// 기본 검증 스키마들
export const emailSchema = z
  .string()
  .min(1, '이메일을 입력해주세요')
  .email('올바른 이메일 형식이 아닙니다')
  .max(255, '이메일은 255자를 초과할 수 없습니다');

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .max(128, '비밀번호는 128자를 초과할 수 없습니다')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다'
  );

export const usernameSchema = z
  .string()
  .min(3, '사용자명은 최소 3자 이상이어야 합니다')
  .max(30, '사용자명은 30자를 초과할 수 없습니다')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    '사용자명은 영문, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다'
  );

// 회원가입 스키마
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
  firstName: z.string().max(50, '이름은 50자를 초과할 수 없습니다').optional(),
  lastName: z.string().max(50, '성은 50자를 초과할 수 없습니다').optional(),
});

// 로그인 스키마
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

// 토큰 새로고침 스키마
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '리프레시 토큰을 입력해주세요'),
});

// 비밀번호 변경 스키마
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

// 비밀번호 찾기 스키마
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// 비밀번호 재설정 스키마
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '재설정 토큰을 입력해주세요'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

// 이메일 인증 스키마
export const verifyEmailSchema = z.object({
  token: z.string().min(1, '인증 토큰을 입력해주세요'),
});

// 소셜 인증 콜백 스키마
export const socialAuthCallbackSchema = z.object({
  code: z.string().min(1, '인증 코드를 입력해주세요'),
  state: z.string().optional(),
});

// 비밀번호 강도 검사 스키마
export const passwordStrengthSchema = z.object({
  password: z.string().min(1, '비밀번호를 입력해주세요'),
}).transform((data) => {
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

// 인증 응답 타입들
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
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    tokens: AuthTokens;
  };
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: AuthUser;
  message: string;
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
