import { SetMetadata } from '@nestjs/common';

/**
 * 🚀 캐시 메타데이터 상수
 */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * 📦 캐시 키 및 TTL 설정 데코레이터
 * 
 * @param key 캐시 키 (동적 파라미터 지원: {userId}, {courseId} 등)
 * @param ttl TTL(Time To Live) - 초 단위
 * 
 * @example
 * ```typescript
 * @Cacheable('user-courses:{userId}', 300) // 5분 캐시
 * async getUserCourses(userId: string) {
 *   return await this.findCourses(userId);
 * }
 * ```
 */
export const Cacheable = (key: string, ttl: number = 300) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyName, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyName, descriptor);
  };
};

/**
 * 🗑️ 캐시 무효화 데코레이터
 * 
 * @param keys 무효화할 캐시 키 패턴 배열
 * 
 * @example
 * ```typescript
 * @CacheEvict(['user-courses:{userId}', 'course-stats:{courseId}'])
 * async updateCourseProgress(userId: string, courseId: string) {
 *   // 업데이트 로직
 * }
 * ```
 */
export const CacheEvict = (keys: string[]) => {
  return SetMetadata('cache:evict', keys);
};

/**
 * 🔄 캐시 업데이트 데코레이터
 * 메서드 실행 후 결과를 캐시에 저장
 * 
 * @param key 캐시 키
 * @param ttl TTL(Time To Live) - 초 단위
 */
export const CachePut = (key: string, ttl: number = 300) => {
  return SetMetadata('cache:put', { key, ttl });
};