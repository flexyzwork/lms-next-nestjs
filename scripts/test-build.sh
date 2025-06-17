#!/bin/bash

echo "🔧 의존성 설치 및 빌드 테스트"
echo "==============================="

cd /Users/codelab/github_repos/lms-next-nestjs

echo "📦 의존성 설치 중..."
pnpm install

echo "🏗️ common 패키지 개별 빌드 테스트..."
cd packages/common
pnpm build

if [ $? -eq 0 ]; then
    echo "✅ common 패키지 빌드 성공!"
else
    echo "❌ common 패키지 빌드 실패"
    exit 1
fi

cd ../..

echo "🚀 전체 프로젝트 빌드 테스트..."
pnpm build:packages

if [ $? -eq 0 ]; then
    echo "✅ 모든 패키지 빌드 성공!"
    echo "🎉 3단계 개선이 완료되었습니다!"
else
    echo "❌ 패키지 빌드 실패"
    exit 1
fi
