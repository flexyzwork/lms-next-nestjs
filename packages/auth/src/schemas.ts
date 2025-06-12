// ==============================
// 🔐 Auth 패키지 스키마 (Re-export from @packages/schemas)
// 통합 스키마 패키지에서 모든 스키마를 가져와서 re-export
// ==============================

export {
  // 기본 검증 스키마
  emailSchema,
  passwordSchema,
  usernameSchema,
  nameSchema,
  phoneSchema,
  
  // 인증 관련 스키마
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  socialAuthCallbackSchema,
  updateProfileSchema,
  updateSettingsSchema,
  deleteAccountSchema,
  passwordStrengthSchema,
  
  // 타입 정의
  type LoginDto,
  type RegisterDto,
  type RefreshTokenDto,
  type ChangePasswordDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  type VerifyEmailDto,
  type SocialAuthCallbackDto,
  type UpdateProfileDto,
  type UpdateSettingsDto,
  type DeleteAccountDto,
  type PasswordStrengthResult,
  
  // 인증 응답 타입들
  type AuthTokens,
  type AuthUser,
  type AuthResponse,
  type LoginResponse,
  type RegisterResponse,
  type AuthError,
  type TokenPayload,
  type SessionInfo,
  
  // 유틸리티 함수들
  sanitizeUserResponse,
  validatePassword,
  validateEmail,
} from '@packages/schemas';
