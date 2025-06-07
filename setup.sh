#!/bin/bash

echo "🚀 LMS 프로젝트 설정 시작..."

# 1. 의존성 설치
echo "📦 의존성 설치 중..."
pnpm install

# 2. 공통 패키지 빌드
echo "🔨 공통 패키지 빌드 중..."
pnpm run build --filter=@packages/auth
pnpm run build --filter=@packages/common
pnpm run build --filter=@packages/config
pnpm run build --filter=@packages/database

# 3. 데이터베이스 초기화 (선택적)
echo "🗄️ 데이터베이스 설정..."
if [ -f "./packages/database/prisma/schema.prisma" ]; then
    echo "Prisma 스키마를 찾았습니다. 데이터베이스를 설정하시겠습니까? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        cd packages/database
        npx prisma generate
        npx prisma db push
        cd ../..
    fi
fi

# 4. 환경 변수 설정 확인
echo "🔧 환경 변수 확인..."
if [ ! -f "./apps/auth/.env" ]; then
    echo "⚠️  auth 앱의 .env 파일이 없습니다."
    echo "AUTH_SERVICE_URL=http://localhost:3001" > ./apps/auth/.env.example
fi

if [ ! -f "./apps/api/.env" ]; then
    echo "⚠️  api 앱의 .env 파일이 없습니다."
    echo "AUTH_SERVICE_URL=http://localhost:3001" > ./apps/api/.env.example
fi

if [ ! -f "./apps/web/.env.local" ]; then
    echo "⚠️  web 앱의 .env.local 파일이 없습니다."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > ./apps/web/.env.local.example
fi

echo "✅ 설정 완료!"
echo ""
echo "🏃‍♂️ 개발 서버 실행 방법:"
echo "  auth 서버: cd apps/auth && pnpm dev"
echo "  api 서버:  cd apps/api && pnpm dev" 
echo "  web 서버:  cd apps/web && pnpm dev"
echo ""
echo "또는 동시 실행:"
echo "  pnpm dev"
