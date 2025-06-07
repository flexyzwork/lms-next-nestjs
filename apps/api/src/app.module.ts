import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// 설정 파일들
import { databaseConfig } from '@packages/config';
import { jwtConfig } from '@packages/config';
import { redisConfig } from '@packages/config';

// 모듈들
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UserCourseProgressModule } from './user-course-progress/user-course-progress.module';
import { PrismaModule, RedisModule } from '@packages/database';

// 가드, 필터, 인터셉터
import { AllExceptionsFilter } from '@packages/common';
import { LoggingInterceptor } from '@packages/common';

@Module({
  imports: [
    // 설정 모듈
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig],
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
    CoursesModule,
    TransactionsModule,
    UserCourseProgressModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    
    // 속도 제한 적용
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
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
