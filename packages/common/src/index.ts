// NestJS 서버용 공통 모듈들
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { User } from './interfaces/user.interface';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ZodBody } from './decorators/zod-body.decorator';

// 순수 스키마 (클라이언트와 서버 공통)
import {
  sortOrderSchema,
  uuidSchema,
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

export {
  Public,
  ZodBody,
  type User,
  CurrentUser,

  // NestJS 서버 전용
  AllExceptionsFilter,
  LoggingInterceptor,
  ZodValidationPipe,

  // 공통 스키마 (클라이언트/서버 공통)
  sortOrderSchema,
  uuidSchema,
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

  // Auth 스키마 (클라이언트/서버 공통)
  loginSchema,
  registerSchema,
  JwtAuthGuard,
  type LoginDto,
  type RegisterDto,
  type AuthUser,
};
