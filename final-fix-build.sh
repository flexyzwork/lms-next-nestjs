#!/bin/bash

echo "🔧 누락된 스키마 추가 후 재빌드"
echo "============================"

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
echo "🌐 2단계: 웹 앱 빌드..."
pnpm --filter @apps/web build

if [ $? -eq 0 ]; then
    echo "✅ 웹 앱 빌드 성공!"
    echo ""
    echo "🎉 모든 스키마 통합 및 빌드 완료!"
    echo ""
    echo "📋 최종 완료 사항:"
    echo "- ✅ packages/schemas에 모든 스키마 통합"
    echo "- ✅ notificationSettingsSchema 추가"
    echo "- ✅ NotificationSettingsFormData 타입 추가"
    echo "- ✅ 웹 앱에서 정상 import 및 빌드"
else
    echo "❌ 웹 앱 빌드 실패"
    echo ""
    echo "🔍 추가 missing export가 있는지 확인이 필요합니다."
fi
