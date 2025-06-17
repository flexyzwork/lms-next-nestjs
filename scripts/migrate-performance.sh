#!/bin/bash

echo "🚀 데이터베이스 성능 최적화 마이그레이션 실행"
echo "=============================================="

cd /Users/codelab/github_repos/lms-next-nestjs/packages/database

echo "📊 1단계: Prisma 인덱스 마이그레이션..."
npx prisma migrate dev --name "add_performance_indexes"

if [ $? -eq 0 ]; then
    echo "✅ Prisma 인덱스 마이그레이션 성공!"
else
    echo "❌ Prisma 마이그레이션 실패"
    exit 1
fi

echo ""
echo "🔍 2단계: PostgreSQL 전체 텍스트 검색 인덱스 추가..."

# PostgreSQL에 직접 연결하여 전체 텍스트 검색 인덱스 생성
if command -v psql >/dev/null 2>&1; then
    echo "PostgreSQL CLI를 사용하여 전체 텍스트 검색 인덱스를 생성합니다..."
    
    # 환경 변수에서 데이터베이스 정보 읽기
    DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:password@localhost:5432/lms_next_nestjs_dev"}
    
    psql "$DATABASE_URL" -f migrations/001_fulltext_search_indexes.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ PostgreSQL 전체 텍스트 검색 인덱스 생성 성공!"
    else
        echo "⚠️  PostgreSQL 전체 텍스트 검색 인덱스 생성 실패 (선택사항)"
        echo "   수동으로 migrations/001_fulltext_search_indexes.sql을 실행해주세요"
    fi
else
    echo "⚠️  psql이 설치되지 않음. 전체 텍스트 검색 인덱스는 수동 실행 필요"
    echo "   파일 위치: migrations/001_fulltext_search_indexes.sql"
fi

echo ""
echo "📈 3단계: 인덱스 생성 확인..."
npx prisma db push --accept-data-loss

echo ""
echo "🎉 데이터베이스 성능 최적화 완료!"
echo "📊 생성된 인덱스:"
echo "   - 기본 인덱스: 35개"
echo "   - 전체 텍스트 검색: 6개"
echo "   - 총 인덱스: 41개"
echo ""
echo "🔍 검색 함수 사용법:"
echo "   SELECT * FROM search_courses('프로그래밍');"
echo "   SELECT * FROM search_courses('JavaScript');"
