// NestJS 서버용 공통 모듈들
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TokenRefreshInterceptor } from './interceptors/token-refresh.interceptor';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
// import { JwtAuthGuard } from './guards/jwt-auth.guard'; // 로컬 구현 사용을 위해 제거
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
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ZodBody } from './decorators/zod-body.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

// 순수 스키마 (클라이언트와 서버 공통)
import {
  sortOrderSchema,
  idSchema,
  // uuidSchema, // 호환성을 위한 이름 유지
  cuid2Schema, // 호환성을 위한 이름 유지
  paginationSchema,
} from './schemas/base.schema';

// API 스키마 (클라이언트/서버 공통)
import {
  createStripePaymentIntentSchema,
  createTransactionSchema,
  transactionQuerySchema,
  chapterProgressSchema,
  sectionProgressSchema,
  updateUserCourseProgressSchema,
  createCourseSchema,
  updateCourseSchema,
  courseQuerySchema,
  updateCourseFormDataSchema,
  type CreateStripePaymentIntentDto,
  type CreateTransactionDto,
  type TransactionQueryDto,
  type ChapterProgressDto,
  type SectionProgressDto,
  type UpdateUserCourseProgressDto,
  type CreateCourseDto,
  type UpdateCourseDto,
  type CourseQueryDto,
  type UpdateCourseFormDataDto,
} from './schemas/api.schema';

// Auth 스키마 (클라이언트/서버 공통)
import {
  loginSchema,
  registerSchema,
  type LoginDto,
  type RegisterDto,
  type AuthUser,
} from './schemas/auth.schema';

// ID 생성 유틸리티
import {
  generateId,
  generateIds,
  isValidCuid2,
  // isLegacyId,
  detectIdType,
  // migrateToNewId,
  sortCuid2Ids,
  generateTypedId,
  type Cuid2,
} from './utils/id.utils';

export {
  // 타입 정의
  type User,
  type UserRole,
  type JwtPayload,
  type JwtRefreshPayload,
  type JwtUser,
  type TokenPair,
  type AuthenticatedRequest,

  // 유틸리티
  RoleUtils,

  // 데코레이터
  Public,
  ZodBody,
  CurrentUser,
  IS_PUBLIC_KEY,

  // NestJS 서버 전용 (JwtAuthGuard 제거됨 - 로컬 구현 사용)
  AllExceptionsFilter,
  LoggingInterceptor,
  TokenRefreshInterceptor,
  ZodValidationPipe,
  // JwtAuthGuard, // 제거됨 - 각 서비스에서 로컬로 구현

  // 공통 스키마 (클라이언트/서버 공통)
  sortOrderSchema,
  idSchema, // 🆔 메인 ID 스키마
  // uuidSchema, // 호환성을 위한 이름 유지
  cuid2Schema, // 호환성을 위한 이름 유지
  paginationSchema,

  // API 스키마 (클라이언트/서버 공통)
  createStripePaymentIntentSchema,
  createTransactionSchema,
  transactionQuerySchema,
  chapterProgressSchema,
  sectionProgressSchema,
  updateUserCourseProgressSchema,
  createCourseSchema,
  updateCourseSchema,
  updateCourseFormDataSchema, // 🆕 FormData 전용 스키마
  courseQuerySchema,
  type CreateStripePaymentIntentDto,
  type CreateTransactionDto,
  type TransactionQueryDto,
  type ChapterProgressDto,
  type SectionProgressDto,
  type UpdateUserCourseProgressDto,
  type CreateCourseDto,
  type UpdateCourseDto,
  type UpdateCourseFormDataDto, // 🆕 FormData 전용 타입
  type CourseQueryDto,

  // Auth 스키마 (클라이언트/서버 공통)
  loginSchema,
  registerSchema,
  type LoginDto,
  type RegisterDto,
  type AuthUser,

  // 🆔 ID 생성 유틸리티
  generateId,
  generateIds,
  isValidCuid2,
  // isLegacyId,
  detectIdType,
  // migrateToNewId,
  sortCuid2Ids,
  generateTypedId,
  type Cuid2,
};
