#!/bin/bash

echo "🔧 schemas 패키지 재빌드 테스트"
echo "============================"

cd /Users/codelab/github_repos/lms-next-nestjs/packages/schemas

echo "📦 의존성 재설치..."
pnpm install

echo "🏗️ 빌드 시도..."
pnpm build

if [ $? -eq 0 ]; then
    echo "✅ schemas 패키지 빌드 성공!"
    echo ""
    echo "📁 생성된 파일들:"
    ls -la dist/
    echo ""
    echo "🎯 다음 단계: 전체 프로젝트 빌드"
    echo "cd /Users/codelab/github_repos/lms-next-nestjs"
    echo "./final-build-test.sh"
else
    echo "❌ 빌드 실패. 타입 에러가 여전히 있습니다."
    echo ""
    echo "🔍 타입 체크 상세:"
    npx tsc --noEmit --pretty
fi
