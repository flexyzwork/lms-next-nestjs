#!/bin/bash

echo "🔧 schemas 패키지 빌드"
echo "===================="

cd /Users/codelab/github_repos/lms-next-nestjs/packages/schemas

echo "📦 의존성 확인..."
pnpm install

echo "🏗️ 빌드 시작..."
pnpm build

if [ $? -eq 0 ]; then
    echo "✅ schemas 패키지 빌드 성공!"
else
    echo "❌ 빌드 실패"
    exit 1
fi

echo ""
echo "📁 생성된 파일들:"
ls -la dist/

echo ""
echo "🎯 다음 단계:"
echo "1. 웹 앱에서 @packages/schemas import 설정"
echo "2. common 패키지에서 schemas import 변경"
echo "3. 로컬 스키마 파일들 삭제"
