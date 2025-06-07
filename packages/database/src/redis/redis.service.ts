import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Redis 서비스
 * - JWT 토큰 블랙리스트 관리
 * - 리프레시 토큰 저장 및 검증
 * - 로그인 시도 횟수 관리 (브루트 포스 방지)
 * - 일반적인 캐시 기능
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis!: Redis; // Using definite assignment assertion

  constructor(private configService: ConfigService) {}

  /**
   * 모듈 초기화 시 Redis 연결 설정
   */
  async onModuleInit() {
    try {
      this.redis = new Redis({
        host: this.configService.get('redis.host'),
        port: this.configService.get('redis.port'),
        password: this.configService.get('redis.password'),
        db: this.configService.get('redis.db'),
        maxRetriesPerRequest: this.configService.get('redis.maxRetriesPerRequest'),
        lazyConnect: this.configService.get('redis.lazyConnect'),
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis에 연결되었습니다');
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis 연결 오류:', err);
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error('Redis 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 모듈 종료 시 Redis 연결 해제
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.disconnect();
      this.logger.log('Redis 연결이 종료되었습니다');
    }
  }

  /**
   * 토큰을 블랙리스트에 추가
   * @param token JWT 토큰
   * @param expiresIn 만료 시간 (초)
   */
  async addToBlacklist(token: string, expiresIn: number): Promise<void> {
    const key = this.getBlacklistKey(token);
    await this.redis.setex(key, expiresIn, 'blacklisted');
    this.logger.log(`토큰이 블랙리스트에 추가되었습니다: ${token.substring(0, 20)}...`);
  }

  /**
   * 토큰이 블랙리스트에 있는지 확인
   * @param token JWT 토큰
   * @returns 블랙리스트 여부
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const key = this.getBlacklistKey(token);
    const result = await this.redis.get(key);
    return result !== null;
  }

  /**
   * 사용자의 모든 리프레시 토큰을 블랙리스트에 추가 (로그아웃 시)
   * @param userId 사용자 ID
   */
  async blacklistUserTokens(userId: string): Promise<void> {
    const pattern = `refresh_token:${userId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`사용자 ${userId}의 모든 리프레시 토큰이 무효화되었습니다`);
    }
  }

  /**
   * 리프레시 토큰 저장
   * @param userId 사용자 ID
   * @param tokenId 토큰 ID
   * @param expiresIn 만료 시간 (초)
   */
  async storeRefreshToken(userId: string, tokenId: string, expiresIn: number): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`;
    await this.redis.setex(key, expiresIn, 'valid');
    this.logger.debug(`리프레시 토큰이 저장되었습니다: ${userId}`);
  }

  /**
   * 리프레시 토큰 유효성 확인
   * @param userId 사용자 ID
   * @param tokenId 토큰 ID
   * @returns 유효성 여부
   */
  async isRefreshTokenValid(userId: string, tokenId: string): Promise<boolean> {
    const key = `refresh_token:${userId}:${tokenId}`;
    const result = await this.redis.get(key);
    return result === 'valid';
  }

  /**
   * 특정 리프레시 토큰 삭제
   * @param userId 사용자 ID
   * @param tokenId 토큰 ID
   */
  async removeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`;
    await this.redis.del(key);
    this.logger.debug(`리프레시 토큰이 삭제되었습니다: ${userId}:${tokenId}`);
  }

  /**
   * 로그인 시도 횟수 관리 (브루트 포스 방지)
   * @param identifier 식별자 (IP 주소 또는 이메일)
   * @param windowSeconds 시간 창 (초)
   * @returns 현재 시도 횟수
   */
  async incrementLoginAttempts(identifier: string, windowSeconds: number = 900): Promise<number> {
    const key = `login_attempts:${identifier}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    return attempts;
  }

  /**
   * 로그인 시도 횟수 조회
   * @param identifier 식별자
   * @returns 시도 횟수
   */
  async getLoginAttempts(identifier: string): Promise<number> {
    const key = `login_attempts:${identifier}`;
    const attempts = await this.redis.get(key);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  /**
   * 로그인 시도 횟수 초기화
   * @param identifier 식별자
   */
  async resetLoginAttempts(identifier: string): Promise<void> {
    const key = `login_attempts:${identifier}`;
    await this.redis.del(key);
  }

  /**
   * 일반적인 캐시 설정
   * @param key 키
   * @param value 값
   * @param ttl TTL (초)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * 캐시 조회
   * @param key 키
   * @returns 값
   */
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  /**
   * 캐시 삭제
   * @param key 키
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * 블랙리스트 키 생성
   * @param token 토큰
   * @returns Redis 키
   */
  private getBlacklistKey(token: string): string {
    return `blacklist:${token}`;
  }

  /**
   * Redis 클라이언트 반환 (고급 사용)
   * @returns Redis 클라이언트
   */
  getClient(): Redis {
    return this.redis;
  }
}
