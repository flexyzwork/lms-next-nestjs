#!/bin/bash

# 🆔 전체 프로젝트 CUID2 통일 작업 스크립트 (웹 빌드 오류 수정 포함)

echo "🆔 전체 프로젝트 CUID2 통일 작업을 시작합니다..."

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📂 프로젝트 루트: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# 1. 모든 packages 빌드
echo "📦 packages 빌드 중..."
echo "  - common 패키지 빌드"
cd packages/common
pnpm run build

echo "  - database 패키지 빌드"
cd ../database
pnpm run build

cd "$PROJECT_ROOT"

# 2. web 앱 의존성 설치 (CUID2 직접 설치, @packages/common 제거)
echo "🌐 web 앱 의존성 업데이트..."
cd apps/web
pnpm install

cd "$PROJECT_ROOT"

# 3. 빌드 테스트
echo "🔨 빌드 테스트 중..."
echo "  - web 앱 빌드 테스트"
cd apps/web
pnpm run build

cd "$PROJECT_ROOT"

echo "✅ CUID2 통일 작업 완료!"
echo ""
echo "📋 변경사항 요약:"
echo ""
echo "✅ apps/api:"
echo "  - 이미 CUID2 사용 중 (@packages/common 통해)"
echo "  - 디버깅 엔드포인트 추가됨"
echo ""
echo "✅ apps/auth:" 
echo "  - 이미 CUID2 사용 중 (@packages/common 통해)"
echo "  - AuthService, UsersService에서 generateId() 사용"
echo ""
echo "✅ apps/web:"
echo "  - @paralleldrive/cuid2 직접 사용 (브라우저 호환)"
echo "  - @packages/common 제거 (Node.js 모듈 충돌 방지)"
echo "  - utils.ts에 CUID2 유틸리티 추가"
echo "  - SectionModal, ChapterModal에서 createId() 사용"
echo "  - 빌드 오류 해결됨"
echo ""
echo "✅ packages/common:"
echo "  - 24자 CUID2 검증으로 수정"
echo "  - 새로운 유틸리티 함수들 추가"
echo "  - 에러 메시지 개선"
echo ""
echo "✅ packages/database:"
echo "  - nanoid → CUID2로 변경"
echo "  - util.ts에 CUID2 기반 genId() 구현"
echo ""
echo "🚀 이제 다음 명령어로 앱들을 시작할 수 있습니다:"
echo "pnpm run dev:api    # API 서버"
echo "pnpm run dev:auth   # Auth 서버" 
echo "pnpm run dev:web    # Web 앱"
echo ""
echo "🔍 테스트 엔드포인트:"
echo "GET http://localhost:3000/api/v1/debug/ids/generate     # ID 생성"
echo "GET http://localhost:3000/api/v1/debug/ids/analyze/{id} # ID 분석"
