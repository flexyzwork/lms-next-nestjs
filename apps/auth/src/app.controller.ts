import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '@packages/common';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * API 루트 엔드포인트
   */
  @Public()
  @Get()
  getApiInfo() {
    return {
      name: 'NestJS 인증 시스템 API',
      version: '1.0.0',
      description: '보안 강화된 JWT 인증 시스템',
      status: 'running',
      timestamp: new Date().toISOString(),
      features: [
        'JWT 액세스/리프레시 토큰',
        '소셜 로그인 (Google, GitHub)',
        'Zod 스키마 검증',
        'Redis 세션 관리',
        '브루트 포스 방지',
        'Rate Limiting',
        '포괄적인 로깅',
      ],
      endpoints: {
        'POST /auth/register': '회원가입',
        'POST /auth/login': '로그인',
        'POST /auth/refresh': '토큰 새로고침',
        'POST /auth/logout': '로그아웃',
        'GET /auth/profile': '프로필 조회',
        'GET /users/me': '사용자 정보',
        'PUT /users/me': '사용자 정보 수정',
        'GET /health': '헬스 체크',
      },
    };
  }

  /**
   * 헬스 체크 엔드포인트
   */
  @Public()
  @Get('health')
  getHealth() {
    return this.appService.getHealthCheck();
  }
}
