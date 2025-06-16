# LMS Next.js + NestJS 통합 프로젝트

이 프로젝트는 auth 마이크로서비스를 중심으로 한 통합 LMS 시스템입니다.

## 🏗️ 프로젝트 구조

```
lms-next-nestjs/
├── apps/
│   ├── auth/          # NestJS 인증 마이크로서비스 (포트: 4000)
│   ├── api/           # Express API 서버 (포트: 4001)
│   └── web/           # Next.js 웹 앱 (포트: 3000)
├── packages/
│   ├── auth/          # 공통 인증 스키마 및 유틸리티
│   ├── common/        # 공통 NestJS 유틸리티 (파이프, 필터 등)
│   ├── config/        # 설정 관리
│   ├── database/      # Prisma 데이터베이스 설정
│   └── queue/         # Redis Queue 설정
```

## 🚀 빠른 시작

### 1단계: 프로젝트 설정

```bash
# 저장소 클론
git clone <repository-url>
cd lms-next-nestjs

# 자동 설정 실행
pnpm setup
```

### 2단계: 환경 변수 설정

각 앱의 환경 변수를 설정하세요:

**apps/auth/.env**
```bash
# .envs/.env.local 작성
cp ./.envs/.env.example ./.envs/.env.local
# 작성한 .env.local 파일을 각 앱의 .env로 연결
cd apps/api && ln -s  ../../.envs/.env.local .env
cd apps/auth && ln -s  ../../.envs/.env.local .env
cd apps/web && ln -s  ../../.envs/.env.local .env

# packages/database/.env 작성
cp packages/database/.env.example packages/database/.env
```

### 3단계: 개발 서버 실행

```bash
# 모든 서비스 동시 실행
pnpm dev

# 또는 개별 실행
pnpm dev:auth    # 인증 서비스
pnpm dev:api     # API 서버
pnpm dev:web     # 웹 앱
```

## 📋 주요 기능

### 🔐 인증 시스템

- **회원가입/로그인**: Zod 스키마 기반 검증
- **JWT 토큰**: Access/Refresh 토큰 방식
- **비밀번호 강도 검사**: 실시간 피드백
- **소셜 로그인**: Google, GitHub 지원
- **세션 관리**: Redis 기반 토큰 관리

### 🏛️ 아키텍처

- **마이크로서비스**: 독립적인 인증 서비스
- **공통 패키지**: 타입 안전성과 코드 재사용
- **API Gateway**: Express 기반 API 라우팅
- **프론트엔드**: Next.js + React Hook Form + Zod

### 🛠️ 기술 스택

- **백엔드**: NestJS, Express.js
- **프론트엔드**: Next.js, React, TypeScript
- **데이터베이스**: PostgreSQL + Prisma
- **캐시/세션**: Redis
- **검증**: Zod
- **빌드 도구**: Turbo, pnpm
- **스타일링**: Tailwind CSS

## 🔧 개발 가이드

### 새로운 인증 스키마 추가

1. `packages/auth/src/schemas.ts`에 스키마 정의
2. 해당 타입을 export
3. auth 앱의 컨트롤러에서 사용
4. API 앱의 라우트에서 프록시
5. Web 앱의 폼에서 활용

### API 엔드포인트

**인증 관련 (포트: 4000, 4001)**
```
POST /api/v1/auth/register           # 회원가입
POST /api/v1/auth/login              # 로그인
POST /api/v1/auth/refresh            # 토큰 갱신
POST /api/v1/auth/logout             # 로그아웃
GET  /api/v1/auth/profile            # 프로필 조회
POST /api/v1/auth/check-password-strength  # 비밀번호 강도 검사
```

### 에러 처리

프로젝트는 통합된 에러 처리 시스템을 사용합니다:

- **Zod 검증 에러**: 자세한 필드별 에러 메시지
- **인증 에러**: 토큰 만료, 권한 부족 등
- **서비스 에러**: 마이크로서비스 간 통신 오류

## 🔍 문제 해결

### 일반적인 문제들

**1. 패키지 빌드 오류**
```bash
# 패키지 다시 빌드
pnpm build:packages
```

**2. 토큰 검증 실패**
- JWT_ACCESS_SECRET 환경변수 확인
- 토큰 만료 시간 확인
- Redis 연결 상태 확인

**3. CORS 오류**
- API 서버의 CORS 설정 확인
- 클라이언트 URL이 허용되었는지 확인

**4. 데이터베이스 연결 오류**
```bash
# Prisma 재생성
cd packages/database
npx prisma generate
npx prisma db push
```

### 로그 확인

```bash
# Auth 서비스 로그
pnpm dev:auth

# API 서버 로그
pnpm dev:api

# 웹 앱 로그
pnpm dev:web
```

## 🧪 테스트

```bash
# 모든 테스트 실행
pnpm test

# 특정 앱 테스트
pnpm --filter @apps/auth test
```

## 📦 빌드 및 배포

```bash
# 프로덕션 빌드
pnpm build

# 개별 앱 빌드
pnpm --filter @apps/auth build
pnpm --filter @apps/api build
pnpm --filter @apps/web build
```

## 🤝 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 피처 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 있습니다.

## 🆘 지원

문제가 발생하면 다음을 확인해주세요:

1. 환경 변수가 올바르게 설정되었는지
2. 모든 서비스가 실행 중인지
3. 데이터베이스와 Redis가 연결되었는지
4. 로그에서 구체적인 에러 메시지 확인

추가 도움이 필요하면 이슈를 생성해주세요.
