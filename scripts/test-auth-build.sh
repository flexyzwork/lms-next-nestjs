#!/bin/bash

echo "🧪 웹 앱 빌드 테스트 (auth 수정 후)"
echo "====================================="

cd /Users/codelab/github_repos/lms-next-nestjs

echo "📦 웹 앱 빌드 시도..."
pnpm --filter @apps/web build

if [ $? -eq 0 ]; then
    echo "✅ 빌드 성공!"
    echo ""
    echo "🎉 모든 의존성 문제가 해결되었습니다!"
else
    echo "❌ 빌드 실패. 추가 오류를 확인하세요."
    echo ""
    echo "🔍 TypeScript 타입 체크:"
    cd apps/web
    npx tsc --noEmit --pretty
fi
