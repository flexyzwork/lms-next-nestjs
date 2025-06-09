#!/bin/bash

echo "🔧 schemas 패키지 재빌드 및 웹 앱 재빌드"
echo "======================================="

cd /Users/codelab/github_repos/lms-next-nestjs

echo "📦 1단계: schemas 패키지 재빌드..."
cd packages/schemas
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ schemas 패키지 빌드 실패"
    exit 1
fi

echo "✅ schemas 패키지 빌드 성공!"
cd ../..

echo ""
echo "🔄 2단계: 웹 앱 node_modules 재설치..."
cd apps/web
rm -rf node_modules/.cache
pnpm install --force

echo ""
echo "🌐 3단계: 웹 앱 빌드..."
pnpm build

if [ $? -eq 0 ]; then
    echo "✅ 웹 앱 빌드 성공!"
else
    echo "❌ 웹 앱 빌드 실패"
    echo ""
    echo "🔍 Next.js 빌드 로그 확인이 필요합니다."
fi
