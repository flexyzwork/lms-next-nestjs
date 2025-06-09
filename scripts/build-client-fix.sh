#!/bin/bash

# 클라이언트 코드 수정 후 빌드 스크립트

echo "🔧 클라이언트 코드 수정 후 빌드 중..."

cd /Users/codelab/github_repos/lms-next-nestjs

echo "🌐 웹 애플리케이션 빌드 중..."
pnpm --filter @apps/web build

echo "✅ 웹 애플리케이션 빌드 완료!"
echo ""
echo "🚀 수정 사항:"
echo "   ✅ StripeProvider에서 courseId 필드 추가"
echo "   ✅ API 정의에서 courseId 매개변수 추가"
echo "   ✅ API 요청 본문에 courseId 포함"
echo ""
echo "💡 웹 애플리케이션을 재시작하여 변경사항을 적용하세요:"
echo "   pnpm dev:web"
echo ""
echo "🧪 테스트할 수 있는 요청:"
echo '   POST /api/v1/transactions/stripe/payment-intent'
echo '   {'
echo '     "amount": 149000,'
echo '     "courseId": "실제_강의_ID"'
echo '   }'
