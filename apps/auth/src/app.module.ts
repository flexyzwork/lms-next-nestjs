import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// 설정 파일들
import { databaseConfig } from '@packages/config';
import { jwtConfig } from '@packages/config';
import { redisConfig } from '@packages/config';
import { socialConfig } from '@packages/config';

// 모듈들
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
// import { RedisModule } from './redis/redis.module';
import { PrismaModule, RedisModule } from '@packages/database';

// 가드, 필터, 인터셉터
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '@packages/common';
import { LoggingInterceptor } from '@packages/common';

@Module({
  imports: [
    // 설정 모듈
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig, socialConfig],
      envFilePath: ['.env', '.env.development'],
    }),

    // 속도 제한 모듈 (DDoS 방지)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1분
        limit: 100, // 분당 100회 요청 제한
      },
    ]),

    // 비즈니스 모듈들
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 전역 가드 설정
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 기본적으로 모든 엔드포인트에 JWT 인증 적용
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 속도 제한 적용
    },

    // 전역 예외 필터 (Zod 에러 처리 포함)
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },

    // 전역 로깅 인터셉터
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
