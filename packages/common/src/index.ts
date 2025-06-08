// NestJS 서버용 공통 모듈들
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { User } from './interfaces/user.interface';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ZodBody } from './decorators/zod-body.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

// 순수 스키마 (클라이언트와 서버 공통)
import {
  sortOrderSchema,
  idSchema,
  uuidSchema, // 호환성을 위한 이름 유지
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
  type CreateStripePaymentIntentDto,
  type CreateTransactionDto,
  type TransactionQueryDto,
  type ChapterProgressDto,
  type SectionProgressDto,
  type UpdateUserCourseProgressDto,
  type CreateCourseDto,
  type UpdateCourseDto,
  type CourseQueryDto,
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
  isLegacyId,
  detectIdType,
  migrateToNewId,
  sortCuid2Ids, 
  generateTypedId, 
  type Cuid2 
} from './utils/id.utils';

export {
  type User,
  Public,
  ZodBody,
  CurrentUser,
  IS_PUBLIC_KEY,

  // NestJS 서버 전용
  AllExceptionsFilter,
  LoggingInterceptor,
  ZodValidationPipe,

  // 공통 스키마 (클라이언트/서버 공통)
  sortOrderSchema,
  idSchema, // 🆔 메인 ID 스키마
  uuidSchema, // 호환성을 위한 이름 유지 
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
  JwtAuthGuard,
  type LoginDto,
  type RegisterDto,
  type AuthUser,

  // 🆔 ID 생성 유틸리티
  generateId,
  generateIds,
  isValidCuid2,
  isLegacyId,
  detectIdType,
  migrateToNewId,
  sortCuid2Ids,
  generateTypedId,
  type Cuid2,
};
