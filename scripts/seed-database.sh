#!/bin/bash

# 🌱 LMS 데이터베이스 시드 실행 스크립트 (수정 버전)
# 
# 이 스크립트는 데이터베이스를 초기화하고 시드 데이터를 생성합니다.

set -e  # 오류 발생 시 스크립트 중단

echo "🌱 LMS 데이터베이스 시드 실행"
echo "================================="
echo ""

# 현재 위치 확인
if [[ ! -f "packages/database/package.json" ]]; then
    echo "❌ 프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

echo "📍 현재 위치: $(pwd)"
echo ""

# 1단계: CUID2 테스트
echo "🔧 1단계: CUID2 생성 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -f "./scripts/test-cuid2.sh" ]]; then
    ./scripts/test-cuid2.sh
else
    echo "⚠️ CUID2 테스트 스크립트를 찾을 수 없어 건너뜁니다."
fi

echo ""

# 2단계: 공통 패키지 빌드
echo "📦 2단계: 공통 패키지 빌드"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd packages/common
echo "📦 common 패키지 빌드 중..."
pnpm build
cd ../..

echo "✅ 공통 패키지 빌드 완료"
echo ""

# 3단계: 데이터베이스 초기화
echo "🗄️ 3단계: 데이터베이스 초기화"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd packages/database

echo "🔄 Prisma 클라이언트 재생성 중..."
npx prisma generate

echo "🗑️ 데이터베이스 초기화 중..."
npx prisma db push --force-reset

echo "✅ 데이터베이스 초기화 완료"
echo ""

# 4단계: 시드 데이터 생성
echo "🌱 4단계: 시드 데이터 생성"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 시드 데이터 삽입 중..."

# tsx가 설치되어 있는지 확인
if ! command -v tsx &> /dev/null; then
    echo "📦 tsx 설치 중..."
    pnpm install tsx --save-dev
fi

# 시드 실행
pnpm seed:dev

cd ../..

echo ""
echo "🎉 시드 작업 완료!"
echo ""
echo "📌 다음 단계:"
echo "  1. API 서버 시작: cd apps/api && pnpm start:dev"
echo "  2. 인증 서버 시작: cd apps/auth && pnpm start:dev"  
echo "  3. 웹 클라이언트 시작: cd apps/web && pnpm dev"
echo ""
echo "✨ 테스트 계정:"
echo "  📧 강사: instructor1@example.com"
echo "  📧 학생: student1@example.com"
echo "  📧 관리자: admin@example.com"
echo "  🔑 비밀번호: password123"
echo ""
