#!/bin/bash

echo "🚀 스키마 통합 및 빌드 최종 테스트"
echo "=================================="

cd /Users/codelab/github_repos/lms-next-nestjs

echo "📦 1단계: 전체 의존성 재설치..."
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install

echo ""
echo "🏗️ 2단계: schemas 패키지 빌드..."
cd packages/schemas
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ schemas 패키지 빌드 실패"
    exit 1
fi

echo "✅ schemas 패키지 빌드 성공!"
ls -la dist/

cd ../..

echo ""
echo "🏗️ 3단계: common 패키지 빌드..."
cd packages/common
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ common 패키지 빌드 실패"
    exit 1
fi

echo "✅ common 패키지 빌드 성공!"
cd ../..

echo ""
echo "🌐 4단계: 웹 앱 빌드..."
pnpm --filter @apps/web build

if [ $? -eq 0 ]; then
    echo "✅ 웹 앱 빌드 성공!"
else
    echo "❌ 웹 앱 빌드 실패"
    exit 1
fi

echo ""
echo "🎉 모든 빌드 성공!"
echo ""
echo "📋 완료된 작업 요약:"
echo "- ✅ packages/schemas에 모든 스키마 통합"
echo "- ✅ common 패키지에서 schemas 패키지 사용"
echo "- ✅ 웹 앱에서 @packages/schemas 사용"
echo "- ✅ 로컬 스키마 파일들 정리"
echo "- ✅ AuthProvider에서 통합 스키마 사용"
echo ""
echo "🔥 이제 중복된 스키마 파일들이 제거되고"
echo "   모든 스키마가 packages/schemas에서 중앙 관리됩니다!"
