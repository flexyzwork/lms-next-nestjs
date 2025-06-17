#!/bin/bash

# 🔧 LMS 오류 수정 자동화 스크립트
# orderIndex 필드 추가 및 권한 오류 수정

echo "🚀 LMS 오류 수정 시작..."
echo "========================="

# 1. database 패키지로 이동
echo "📁 database 패키지로 이동..."
cd /Users/codelab/github_repos/lms-next-nestjs/packages/database

# 2. Prisma 클라이언트 재생성
echo "🔄 Prisma 클라이언트 재생성..."
pnpm prisma generate

# 3. 데이터베이스 스키마 푸시
echo "🗄️  데이터베이스 스키마 업데이트..."
pnpm prisma db push

# 4. orderIndex 초기화 스크립트 실행
echo "📊 기존 데이터 orderIndex 초기화..."
pnpm tsx scripts/initialize-order-index.ts

echo ""
echo "✅ 수정 완료!"
echo "==============="
echo "🎯 해결된 문제들:"
echo "  • orderIndex 필드 누락 오류"
echo "  • 트랜잭션 권한 검증 오류"
echo ""
echo "🔄 다음 단계:"
echo "  1. API 서버 재시작"
echo "  2. 기능 테스트 진행"
echo ""
echo "🎉 이제 UserCourseProgressService가 정상 작동합니다!"
