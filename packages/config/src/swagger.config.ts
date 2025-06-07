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
        name: 'JWT',
        description: 'JWT 토큰을 입력하세요',
        in: 'header',
      },
      bearerAuthName
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Swagger UI 설정
  SwaggerModule.setup(path, app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침해도 토큰 유지
      tagsSorter: 'alpha', // 태그 알파벳 순 정렬
      operationsSorter: 'alpha', // 작업 알파벳 순 정렬
    },
    customSiteTitle: title,
    customfavIcon: '/favicon.ico',
  });
}

/**
 * LMS 인증 서비스용 Swagger 설정
 * @param app NestJS 애플리케이션 인스턴스
 * @param port 서비스 포트
 */
export function setupAuthSwagger(app: INestApplication, port: number | string): void {
  setupSwagger(app, {
    title: 'LMS 인증 API 문서',
    description: 'LMS 시스템의 인증 관련 API 문서입니다.',
    version: '1.0',
    path: 'api-docs',
    bearerAuthName: 'access-token'
  });

  console.log(`📚 Swagger 문서: http://localhost:${port}/api-docs`);
}
