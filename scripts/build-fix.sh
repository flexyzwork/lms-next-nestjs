#!/bin/bash

# 스키마 패키지 빌드 및 수정 사항 적용 스크립트

echo "🔧 스키마 수정 사항 빌드 중..."

cd /Users/codelab/github_repos/lms-next-nestjs

echo "📦 Schemas 패키지 빌드 중..."
pnpm --filter @packages/schemas build

echo "📦 Common 패키지 빌드 중..."
pnpm --filter @packages/common build

echo "🏢 API 서버 재시작을 위한 빌드..."
pnpm --filter @apps/api build

echo "✅ 모든 패키지 빌드 완료!"
echo ""
echo "🚀 수정 사항:"
echo "   ✅ Stripe Payment Intent 스키마 추가 (courseId 필수 필드 포함)"
echo "   ✅ Transaction Query 스키마 추가"
echo "   ✅ 결제 금액 제한 100만원 → 5천만원으로 증가"
echo "   ✅ 강의 가격 제한도 5천만원으로 증가"
echo ""
echo "💡 API 서버를 재시작하여 변경사항을 적용하세요:"
echo "   pnpm dev:api" "📦 Common 패키지 빌드 중..."
pnpm --filter @packages/common build

echo "🏗️ API 서버 재시작을 위한 빌드..."
pnpm --filter @apps/api build

echo "✅ 모든 패키지 빌드 완료!"
echo ""
echo "🚀 수정 사항:"
echo "   ✅ Stripe Payment Intent 스키마 추가 (courseId 필수 필드 포함)"
echo "   ✅ Transaction Query 스키마 추가"
echo "   ✅ 결제 금액 제한 100만원 → 5천만원으로 증가"
echo "   ✅ 강의 가격 제한도 5천만원으로 증가"
echo ""
echo "💡 API 서버를 재시작하여 변경사항을 적용하세요:"
echo "   pnpm dev:api"
