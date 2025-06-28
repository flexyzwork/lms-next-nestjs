import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

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
import { DebugModule } from './debug/debug.module'; // 🔧 개발 환경 전용
import { PerformanceModule } from './performance/performance.module'; // 📊 성능 모니터링
import { PrismaModule, RedisModule } from '@packages/database';

// 가드, 필터, 인터셉터 (공통 패키지)
import { AllExceptionsFilter } from '@packages/common';
import { LoggingInterceptor } from '@packages/common';
// import { TokenRefreshInterceptor } from '@packages/common'; // 일시적으로 비활성화

// 로컬 JWT 가드와 전략
import { ApiJwtAuthGuard } from './auth/guards/api-jwt-auth.guard';
import { JwtStrategy } from './auth/strategies/jwt.strategy';

@Module({
  imports: [
    // 설정 모듈
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig],
      envFilePath: ['.env', '.env.development'],
    }),

    // Passport 모듈
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT 모듈 설정
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('jwt.secret');
        const jwtExpiresIn = configService.get<string>('jwt.expiresIn');
        
        if (!jwtSecret) {
          throw new Error('JWT_SECRET이 설정되지 않았습니다. 환경 변수를 확인해주세요.');
        }

        console.log('🔑 JWT 모듈 설정 완료 - 시크릿 존재:', !!jwtSecret);

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: jwtExpiresIn || '1h',
          },
        };
      },
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
    
    // 📊 성능 모니터링 모듈
    PerformanceModule,
    
    // 🔧 디버깅 모듈 (개발 환경 전용 - 프로덕션에서는 제거)
    DebugModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    
    // Core NestJS providers
    Reflector,
    
    // JWT 전략
    JwtStrategy,
    
    // 로컬 JWT Auth Guard (Reflector 의존성 보장)
    ApiJwtAuthGuard,
    
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

    // 토큰 갱신 인터셉터 (JWT 모듈이 준비된 후 활성화)
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TokenRefreshInterceptor,
    // },
  ],
  // 다른 모듈에서도 사용할 수 있도록 export
  exports: [ApiJwtAuthGuard, JwtModule],
})
export class AppModule {}
