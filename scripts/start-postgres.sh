#!/bin/bash

# 🐳 Docker PostgreSQL 빠른 시작 스크립트

echo "🐳 Docker로 PostgreSQL 시작 중..."

# 기존 컨테이너 중지 및 제거
docker stop lms-postgres 2>/dev/null || true
docker rm lms-postgres 2>/dev/null || true

# PostgreSQL 컨테이너 실행
docker run -d \
  --name lms-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=lms_next_nestjs_dev \
  -p 5432:5432 \
  postgres:15

echo "⏳ PostgreSQL 시작 대기 중..."
sleep 5

echo "🔍 연결 테스트 중..."
if docker exec lms-postgres pg_isready -U postgres; then
    echo "✅ PostgreSQL 준비 완료!"
    echo "📊 연결 정보:"
    echo "  호스트: localhost"
    echo "  포트: 5432"
    echo "  사용자: postgres"
    echo "  비밀번호: postgres"
    echo "  데이터베이스: lms_next_nestjs_dev"
    echo ""
    echo "🌱 이제 시드를 실행할 수 있습니다:"
    echo "  cd packages/database && npx tsx seeds/seed.ts"
else
    echo "❌ PostgreSQL 시작 실패"
    exit 1
fi
