#!/bin/bash

# 🔧 Stripe KRW 센트 변환 오류 수정 스크립트

echo "🔧 Stripe KRW 센트 변환 오류 수정 중..."

cd /Users/codelab/github_repos/lms-next-nestjs

echo "📦 Schemas 패키지 빌드 중..."
pnpm --filter @packages/schemas build

echo "📦 Common 패키지 빌드 중..."
pnpm --filter @packages/common build

echo "🏢 API 서버 빌드 중..."
pnpm --filter @apps/api build

echo "✅ 모든 빌드 완료!"
echo ""
echo "🚀 주요 수정 사항:"
echo "   ✅ Stripe KRW 센트 변환 제거 (원 단위 그대로 전달)"
echo "   ✅ 결제 금액 제한을 Stripe KRW 제한(9,999만원)에 맞춤"
echo "   ✅ 한국어 주석 및 로그 메시지 개선"
echo ""
echo "🔍 수정된 내용:"
echo "   - TransactionsService: amount * 100 제거"
echo "   - 스키마: 최대 금액 99,999,999원으로 조정"
echo "   - 로그: KRW 원 단위 명시"
echo ""
echo "💡 API 서버를 재시작하여 변경사항을 적용하세요:"
echo "   pnpm dev:api"
echo ""
echo "🧪 이제 29,900,000원 결제가 성공해야 합니다!"
