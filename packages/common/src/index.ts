// ==============================
// 🏗️ NestJS 서버용 공통 모듈들
// ==============================
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TokenRefreshInterceptor } from './interceptors/token-refresh.interceptor';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

// 🔒 사용자 인터페이스 및 유틸리티
import type {
  User,
  UserRole,
  JwtPayload,
  JwtRefreshPayload,
  JwtUser,
  TokenPair,
  AuthenticatedRequest
} from './interfaces/user.interface';
import { RoleUtils } from './interfaces/user.interface';

// 🎨 데코레이터
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ZodBody } from './decorators/zod-body.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

// ==============================
// 📋 공통 스키마 (클라이언트/서버 공통)
// ==============================

// 🔧 기본 스키마
import {
  sortOrderSchema,
  idSchema,
  cuid2Schema,
  paginationSchema,
  timestampSchema,
  softDeleteSchema,
  dateRangeSchema,
  successResponseSchema,
  errorResponseSchema,
  paginatedResponseSchema,
  type PaginationDto,
  type DateRangeDto,
  type SuccessResponse,
  type ErrorResponse,
  type PaginatedResponse,
} from './schemas/base.schema';

// 🔐 인증 스키마 
import {
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
} from './schemas/auth.schema';

// 🎓 API 스키마 
import {
  // 강의 관련 스키마
  courseStatusSchema,
  courseLevelSchema,
  chapterTypeSchema,
  createCourseSchema,
  updateCourseSchema,
  updateCourseFormDataSchema,
  courseQuerySchema,
  
  // 결제 관련 스키마
  paymentProviderSchema,
  createStripePaymentIntentSchema,
  createTransactionSchema,
  transactionQuerySchema,
  
  // 학습 진도 관련 스키마
  chapterProgressSchema,
  sectionProgressSchema,
  updateUserCourseProgressSchema,
  
  // 댓글 관련 스키마
  createCommentSchema,
  updateCommentSchema,
  commentQuerySchema,
  
  // 등록 관련 스키마
  createEnrollmentSchema,
  enrollmentQuerySchema,
  
  // 사용자 관련 스키마
  userQuerySchema,
  
  // 타입 정의
  type CreateCourseDto,
  type UpdateCourseDto,
  type UpdateCourseFormDataDto,
  type CourseQueryDto,
  type CreateStripePaymentIntentDto,
  type CreateTransactionDto,
  type TransactionQueryDto,
  type ChapterProgressDto,
  type SectionProgressDto,
  type UpdateUserCourseProgressDto,
  type CreateCommentDto,
  type UpdateCommentDto,
  type CommentQueryDto,
  type CreateEnrollmentDto,
  type EnrollmentQueryDto,
  type UserQueryDto,
  
  // 유틸리티 함수들
  validateCoursePrice,
  calculateCourseProgress,
  sanitizeCourseQuery,
} from './schemas/api.schema';

// 🆔 ID 생성 유틸리티
import {
  generateId,
  generateIds,
  isValidCuid2,
  detectIdType,
  sortCuid2Ids,
  generateTypedId,
  type Cuid2,
} from './utils/id.utils';

// 🔐 인증 유틸리티
import {
  TokenManager,
  PasswordValidator,
  FormValidator,
  AuthStateManager,
  SecurityUtils,
  SessionManager,
  DeviceUtils,
} from './utils/auth.utils';

// 🌐 Auth API 클라이언트
import {
  AuthApiClient,
  authApi,
  useAuthApi,
} from './utils/auth-client.utils';

// ==============================
// 📤 Export 정리
// ==============================

export {
  // ==============================
  // 🏗️ NestJS 서버 전용 모듈들
  // ==============================
  
  // 🔒 타입 정의
  type User,
  type UserRole,
  type JwtPayload,
  type JwtRefreshPayload,
  type JwtUser,
  type TokenPair,
  type AuthenticatedRequest,

  // 🔧 유틸리티
  RoleUtils,

  // 🎨 데코레이터
  Public,
  ZodBody,
  CurrentUser,
  IS_PUBLIC_KEY,

  // 🔌 NestJS 서버 전용 (가드는 각 서비스에서 로컬 구현)
  AllExceptionsFilter,
  LoggingInterceptor,
  TokenRefreshInterceptor,
  ZodValidationPipe,

  // ==============================
  // 📋 공통 스키마 (클라이언트/서버 공통)
  // ==============================
  
  // 🔧 기본 스키마
  sortOrderSchema,
  idSchema, // 🆔 메인 ID 스키마 (CUID2)
  cuid2Schema, // 🆔 명시적 CUID2 스키마
  paginationSchema,
  timestampSchema,
  softDeleteSchema,
  dateRangeSchema,
  successResponseSchema,
  errorResponseSchema,
  paginatedResponseSchema,
  
  // 🔧 기본 타입
  type PaginationDto,
  type DateRangeDto,
  type SuccessResponse,
  type ErrorResponse,
  type PaginatedResponse,

  // 🔐 인증 스키마
  emailSchema,
  passwordSchema,
  usernameSchema,
  nameSchema,
  phoneSchema,
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
  
  // 🔐 인증 타입
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
  type AuthTokens,
  type AuthUser,
  type AuthResponse,
  type LoginResponse,
  type RegisterResponse,
  type AuthError,
  type TokenPayload,
  type SessionInfo,
  
  // 🔐 인증 유틸리티
  sanitizeUserResponse,
  validatePassword,
  validateEmail,

  // 🎓 API 스키마
  courseStatusSchema,
  courseLevelSchema,
  chapterTypeSchema,
  createCourseSchema,
  updateCourseSchema,
  updateCourseFormDataSchema,
  courseQuerySchema,
  paymentProviderSchema,
  createStripePaymentIntentSchema,
  createTransactionSchema,
  transactionQuerySchema,
  chapterProgressSchema,
  sectionProgressSchema,
  updateUserCourseProgressSchema,
  createCommentSchema,
  updateCommentSchema,
  commentQuerySchema,
  createEnrollmentSchema,
  enrollmentQuerySchema,
  userQuerySchema,
  
  // 🎓 API 타입
  type CreateCourseDto,
  type UpdateCourseDto,
  type UpdateCourseFormDataDto,
  type CourseQueryDto,
  type CreateStripePaymentIntentDto,
  type CreateTransactionDto,
  type TransactionQueryDto,
  type ChapterProgressDto,
  type SectionProgressDto,
  type UpdateUserCourseProgressDto,
  type CreateCommentDto,
  type UpdateCommentDto,
  type CommentQueryDto,
  type CreateEnrollmentDto,
  type EnrollmentQueryDto,
  type UserQueryDto,
  
  // 🎓 API 유틸리티
  validateCoursePrice,
  calculateCourseProgress,
  sanitizeCourseQuery,

  // 🆔 ID 생성 유틸리티
  generateId,
  generateIds,
  isValidCuid2,
  detectIdType,
  sortCuid2Ids,
  generateTypedId,
  type Cuid2,

  // 🔐 인증 유틸리티 클래스
  TokenManager,
  PasswordValidator,
  FormValidator,
  AuthStateManager,
  SecurityUtils,
  SessionManager,
  DeviceUtils,

  // 🌐 Auth API 클라이언트
  AuthApiClient,
  authApi,
  useAuthApi,
};
