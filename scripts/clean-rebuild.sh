#!/bin/bash

echo "🔧 의존성 정리 및 재설치"
echo "======================="

cd /Users/codelab/github_repos/lms-next-nestjs

echo "🗑️ 기존 node_modules 제거..."
rm -rf node_modules
rm -rf apps/*/node_modules  
rm -rf packages/*/node_modules

echo "📦 의존성 재설치..."
pnpm install

echo "🏗️ schemas 패키지 빌드..."
cd packages/schemas
pnpm build
cd ../..

echo "🧪 웹 앱 빌드 테스트..."
pnpm --filter @apps/web build

echo "✅ 완료!"
