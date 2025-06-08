#!/bin/bash

echo "🔧 common 패키지 재빌드"
echo "====================="

cd /Users/codelab/github_repos/lms-next-nestjs

echo "📦 common 패키지 빌드..."
cd packages/common
pnpm build
cd ../..

echo "🚀 API 서버 재시작..."
echo "API 서버를 수동으로 재시작해주세요: pnpm dev:api"

echo "✅ 스키마 수정 완료!"
echo ""
echo "📋 수정된 내용:"
echo "- minPrice, maxPrice 필드를 optional로 수정"
echo "- .pipe() 체이닝 문제 해결"
echo "- transform에서 undefined 반환 시 정상 처리"
