// ==============================
// 🏗️ NestJS 서버용 공통 모듈들 (핵심만)
// 스키마는 @packages/schemas에서 직접 import하세요
// ==============================

// 🎨 데코레이터 (기본적인 것들만)
export { CurrentUser } from './decorators/current-user.decorator';
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';
export { ZodBody } from './decorators/zod-body.decorator';

// 🚀 성능 최적화 데코레이터
export { Cacheable, CacheEvict, CachePut } from './decorators/cache.decorator';

// 🔌 NestJS 서버 전용 (기본적인 것들만)
export { AllExceptionsFilter } from './filters/all-exceptions.filter';
export { LoggingInterceptor } from './interceptors/logging.interceptor';
export { ZodValidationPipe } from './pipes/zod-validation.pipe';

// 🚀 성능 최적화 인터셉터
export { CacheInterceptor, CacheEvictInterceptor } from './interceptors/cache.interceptor';

// 🛡️ 보안 미들웨어 (서버 환경에서만 사용 가능)
// export {
//   setupSecurityMiddleware,
//   setupDevelopmentMiddleware,
//   setupRequestLogging,
//   setupHealthCheck,
//   setupAllMiddleware,
// } from './middleware/security.middleware';

// 👤 사용자 인터페이스 및 타입들
export {
  type User,
  type UserRole,
  type JwtPayload,
  type JwtRefreshPayload,
  type AuthenticatedRequest,
  type TokenPair,
  type JwtUser,
  RoleUtils,
} from './interfaces/user.interface';

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

// 🔐 인증 유틸리티 (서버 전용)
export {
  extractClientIp,
  extractBearerToken,
  parseUserAgent,
  prepareSecurityLogData,
  parseTimeString,
  checkPasswordStrength,
  maskEmail,
  maskPhone,
  sanitizeUser,
  validateRequestSize,
  createRateLimitKey,
  generateDeviceFingerprint,
} from './utils/auth.utils';

// ===== 주의사항 =====
// 📋 스키마가 필요하면 @packages/schemas에서 직접 import하세요:
// import { LoginDto, registerSchema } from '@packages/schemas';
//
// 🏗️ 이 패키지는 오직 NestJS 서버 전용 유틸리티만 제공합니다.
