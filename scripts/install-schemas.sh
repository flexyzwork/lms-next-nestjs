#!/bin/bash

# schemas 패키지 의존성 설치 및 빌드 스크립트

echo "🔧 schemas 패키지 의존성 설치 중..."

# 루트에서 전체 workspace 의존성 설치
cd /Users/codelab/github_repos/lms-next-nestjs
pnpm install

echo "📦 schemas 패키지 빌드 중..."

# schemas 패키지 빌드
cd packages/schemas
pnpm build

echo "✅ schemas 패키지 설치 완료!"
