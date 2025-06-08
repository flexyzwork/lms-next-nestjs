#!/bin/bash

echo "🔧 전체 workspace 의존성 재설치 및 빌드"
echo "========================================="

# 루트 디렉토리로 이동
cd /Users/codelab/github_repos/lms-next-nestjs

echo "📦 기존 node_modules 제거..."
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf apps/*/node_modules

echo "🔄 전체 의존성 재설치..."
pnpm install

echo "📦 schemas 패키지 먼저 빌드..."
cd packages/schemas
pnpm build
cd ../..

echo "🏗️ 모든 packages 빌드..."
pnpm build:packages

echo "🌐 웹 앱 빌드..."
pnpm --filter @apps/web build

echo "✅ 빌드 완료!"
