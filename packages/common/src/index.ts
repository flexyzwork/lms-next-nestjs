// ==============================
// 🏗️ NestJS 서버용 공통 모듈들 (핵심만)
// ==============================

// 🎨 데코레이터 (기본적인 것들만)
export { CurrentUser } from './decorators/current-user.decorator';
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';
export { ZodBody } from './decorators/zod-body.decorator';

// 🔌 NestJS 서버 전용 (기본적인 것들만)
export { AllExceptionsFilter } from './filters/all-exceptions.filter';
export { LoggingInterceptor } from './interceptors/logging.interceptor';
export { ZodValidationPipe } from './pipes/zod-validation.pipe';

// 🔐 인증 스키마 (통합 스키마에서 re-export)
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
} from './schemas/auth.schema';

// 🔧 기본 스키마
export {
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

// 🆔 ID 생성 유틸리티
export {
  generateId,
  generateIds,
  isValidCuid2,
  detectIdType,
  sortCuid2Ids,
  generateTypedId,
  type Cuid2,
} from './utils/id.utils';

// 📚 강의 관리 스키마 (API 전용)
export {
  // 강의 스키마
  createCourseSchema,
  updateCourseSchema,
  updateCourseFormDataSchema,
  courseQuerySchema,
  
  // 강의 관련 타입
  type CreateCourseDto,
  type UpdateCourseDto,
  type UpdateCourseFormDataDto,
  type CourseQueryDto,
  
  // 결제 스키마
  createStripePaymentIntentSchema,
  createTransactionSchema,
  transactionQuerySchema,
  
  // 결제 관련 타입
  type CreateStripePaymentIntentDto,
  type CreateTransactionDto,
  type TransactionQueryDto,
  
  // 학습 진도 스키마
  chapterProgressSchema,
  sectionProgressSchema,
  updateUserCourseProgressSchema,
  
  // 학습 진도 타입
  type ChapterProgressDto,
  type SectionProgressDto,
  type UpdateUserCourseProgressDto,
  
  // 댓글 스키마
  createCommentSchema,
  updateCommentSchema,
  commentQuerySchema,
  
  // 댓글 관련 타입
  type CreateCommentDto,
  type UpdateCommentDto,
  type CommentQueryDto,
  
  // 등록 스키마
  createEnrollmentSchema,
  enrollmentQuerySchema,
  
  // 등록 관련 타입
  type CreateEnrollmentDto,
  type EnrollmentQueryDto,
  
  // 사용자 쿼리 스키마
  userQuerySchema,
  type UserQueryDto,
  
  // 유틸리티 함수
  validateCoursePrice,
  calculateCourseProgress,
  sanitizeCourseQuery,
} from './schemas/api.schema';
