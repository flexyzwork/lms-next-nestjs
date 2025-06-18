import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Swagger API 문서 설정 함수
 * @param app NestJS 애플리케이션 인스턴스
 * @param config Swagger 설정 옵션
 */
export interface SwaggerConfig {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  bearerAuthName?: string;
}

export function setupSwagger(
  app: INestApplication,
  config: SwaggerConfig = {}
): void {
  const {
    title = 'API 문서',
    description = '애플리케이션 API 문서입니다.',
    version = '1.0',
    path = 'api-docs',
    bearerAuthName = 'access-token'
  } = config;

  // Swagger 문서 설정
  const swaggerConfig = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'JWT 액세스 토큰을 입력하세요 (Bearer 접두사 제외)',
        in: 'header',
      },
      bearerAuthName
    )
    .addServer('http://localhost:4000', '개발 서버')
    .addServer('/', '로컬 서버')
    .addTag('🔐 인증 (Authentication)', '사용자 인증 및 토큰 관리')
    .addTag('👤 사용자 (Users)', '사용자 정보 관리')
    .addTag('🔧 디버깅 (Debug)', '개발 및 디버깅용 엔드포인트')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Swagger UI 설정
  SwaggerModule.setup(path, app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침해도 토큰 유지
      tagsSorter: 'alpha', // 태그 알파벳 순 정렬
      operationsSorter: 'alpha', // 작업 알파벳 순 정렬
      docExpansion: 'none', // 기본적으로 닫혀있음
      filter: true, // 검색 필터 활성화
      showRequestHeaders: true, // 요청 헤더 표시
      tryItOutEnabled: true, // Try it out 버튼 활성화
      displayRequestDuration: true, // 요청 시간 표시
      defaultModelsExpandDepth: 2, // 모델 확장 깊이
      defaultModelExpandDepth: 2, // 모델 확장 깊이
      requestInterceptor: (req: any) => {
        console.log('Swagger 요청 로깅:', req.method, req.url);
        return req;
      },
      responseInterceptor: (res: any) => {
        console.log('Swagger 응답 로깅:', res.status, res.url);
        return res;
      },
    },
    customSiteTitle: title,
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #3b4151; font-size: 28px; }
      .swagger-ui .scheme-container { background: #f7f7f7; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .swagger-ui .auth-wrapper { margin: 20px 0; }
      .swagger-ui .btn.authorize { background-color: #49cc90; border-color: #49cc90; }
      .swagger-ui .btn.authorize:hover { background-color: #3ea672; border-color: #3ea672; }
      .swagger-ui .authorization__btn { background-color: #49cc90; border-color: #49cc90; }
      .swagger-ui .authorization__btn:hover { background-color: #3ea672; border-color: #3ea672; }
      .swagger-ui .try-out__btn { margin-left: 10px; }
      .swagger-ui .execute-wrapper { text-align: center; padding: 20px; }
      .swagger-ui .btn.execute { background: #4990e2; color: white; border-color: #4990e2; }
    `,
  });
}

/**
 * LMS 인증 서비스용 Swagger 설정
 * @param app NestJS 애플리케이션 인스턴스
 * @param port 서비스 포트
 */
export function setupAuthSwagger(app: INestApplication, port: number | string): void {
  setupSwagger(app, {
    title: '🔐 LMS 인증 API',
    description: `
# LMS 시스템 인증 서비스 API 문서

이 API는 LMS(Learning Management System)의 인증 서비스를 제공합니다.

## 🚀 주요 기능
- **회원가입/로그인**: 이메일 기반 사용자 인증
- **JWT 토큰 관리**: 액세스/리프레시 토큰 발급 및 갱신
- **보안**: 다양한 보안 기능 및 에러 처리
- **소셜 로그인**: Google, GitHub 연동 (예정)

## 🔑 인증 방법
1. \`/auth/login\` 엔드포인트로 로그인
2. 응답에서 받은 \`accessToken\`을 복사
3. 우측 상단의 **"Authorize"** 버튼 클릭
4. \`accessToken\`을 입력 (Bearer 접두사 제외)
5. 이제 🔒 표시가 있는 엔드포인트들을 테스트할 수 있습니다!

## 📝 테스트 사용자
개발환경에서는 다음 계정으로 테스트할 수 있습니다:
- **이메일**: student1@example.com
- **비밀번호**: password123

## ⚠️ 주의사항
- 토큰은 15분 후 만료됩니다
- 만료된 토큰은 \`/auth/refresh\` 엔드포인트로 갱신하세요
- 개발환경에서만 디버깅 엔드포인트가 활성화됩니다
    `,
    version: '1.0.0',
    path: 'api-docs',
    bearerAuthName: 'access-token'
  });

  console.log(`📚 Swagger 문서: http://localhost:${port}/api-docs`);
  console.log(`🔧 인증 테스트: 로그인 후 우측 상단 "Authorize" 버튼 클릭`);
  console.log(`📋 API 경로: http://localhost:${port}/api/v1`);
}
