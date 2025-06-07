# 🚀 LMS API 서버 - NestJS 마이그레이션 완료

## 📝 변경 사항 요약

### ✅ 완료된 작업

1. **Express → NestJS 마이그레이션**
   - 기존 Express 라우터를 NestJS 컨트롤러로 변환
   - RESTful API 엔드포인트 유지
   - Zod 기반 데이터 검증 시스템 구축

2. **모듈 구조화**
   - `courses` - 강의 관리 (CRUD, 파일 업로드)
   - `transactions` - 결제 및 트랜잭션 처리
   - `user-course-progress` - 학습 진도 관리

3. **공통 기능**
   - 전역 예외 필터 (Zod 에러 처리)
   - 로깅 인터셉터
   - API 문서 (Swagger)
   - 요청 제한 (Rate Limiting)

4. **패키지 활용**
   - `@packages/auth` - 인증/권한 관리
   - `@packages/common` - 공통 유틸리티
   - `@packages/database` - Prisma 연결
   - `@packages/config` - 설정 관리

## 🎯 API 엔드포인트

### 📚 강의 관리 (`/api/v1/courses`)
- `GET /` - 강의 목록 조회 (공개)
- `POST /` - 강의 생성 (인증 필요)
- `GET /:courseId` - 강의 상세 조회 (공개)
- `PUT /:courseId` - 강의 수정 (인증 필요)
- `DELETE /:courseId` - 강의 삭제 (인증 필요)
- `POST /:courseId/sections/:sectionId/chapters/:chapterId/get-upload-url` - 비디오 업로드 URL

### 💳 결제 (`/api/v1/transactions`)
- `GET /` - 트랜잭션 목록 조회 (인증 필요)
- `POST /` - 트랜잭션 생성 (인증 필요)
- `POST /stripe/payment-intent` - Stripe 결제 의도 생성 (인증 필요)

### 📈 학습 진도 (`/api/v1/users/course-progress`)
- `GET /:userId/enrolled-courses` - 등록 강의 목록 (인증 필요)
- `GET /:userId/courses/:courseId` - 강의 진도 조회 (인증 필요)
- `PUT /:userId/courses/:courseId` - 진도 업데이트 (인증 필요)

### 🏠 시스템
- `GET /` - API 정보
- `GET /health` - 헬스체크

## 🔧 개발 서버 실행

### 1. 의존성 설치
```bash
cd /Users/codelab/github_repos/lms-next-nestjs
pnpm install
```

### 2. API 서버 시작
```bash
cd apps/api
pnpm dev
```

### 3. 확인
- API 서버: http://localhost:4001
- API 문서: http://localhost:4001/api/v1
- 헬스체크: http://localhost:4001/health

## 🔄 apps/web과의 연결

### CORS 설정
웹 앱 (localhost:3000-3003)에서 API 호출 가능하도록 설정 완료

### 인증 통합
- JWT 기반 인증 시스템
- `apps/auth` 서비스와 연동
- 토큰 기반 권한 검증

## 🔍 Zod 검증 시스템

### 강의 생성 예시
```typescript
const CreateCourseSchema = z.object({
  teacherId: z.string().uuid('올바른 교사 ID를 입력해주세요'),
  teacherName: z.string().min(1, '교사명은 필수입니다'),
});
```

### 트랜잭션 생성 예시
```typescript
const CreateTransactionSchema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
  amount: z.number().min(0),
  paymentProvider: z.enum(['stripe', 'paypal', 'kakao_pay']),
});
```

## 📊 모니터링 및 로깅

### 요청 로깅
- 모든 HTTP 요청 자동 로깅
- 에러 발생 시 상세 로그
- 사용자 행동 추적

### 속도 제한
- 분당 요청 제한 적용
- 엔드포인트별 차등 제한
- DDoS 방지

## 🔒 보안 기능

### 헬멧 보안
- CSP (Content Security Policy)
- XSS 방지
- 클릭재킹 방지

### 데이터 검증
- 입력 데이터 Zod 스키마 검증
- SQL 인젝션 방지 (Prisma ORM)
- 타입 안전성

## 🚧 다음 단계

1. **JWT 전략 설정 완료**
   - Passport JWT 전략 구현
   - 토큰 검증 미들웨어 활성화

2. **통합 테스트**
   - E2E 테스트 구축
   - API 응답 검증

3. **성능 최적화**
   - 데이터베이스 쿼리 최적화
   - 캐시 전략 구현

4. **배포 준비**
   - Docker 설정 최적화
   - 환경별 설정 분리

## ⚠️ 임시 설정

현재 개발/테스트를 위해 JWT 인증이 일부 비활성화되어 있습니다.
프로덕션 배포 전 인증 시스템을 완전히 활성화해야 합니다.

```typescript
// 임시 비활성화된 부분
// @UseGuards(JwtAuthGuard)
// @CurrentUser() user: User
```

## 📞 문의

개발 관련 문의사항이나 추가 기능 요청은 팀에 연락해주세요.
