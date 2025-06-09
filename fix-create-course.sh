#!/bin/bash

echo "🔧 강의 생성 API 수정 후 테스트"
echo "============================"

cd /Users/codelab/github_repos/lms-next-nestjs

echo "🌐 1단계: 웹 앱 재빌드..."
pnpm --filter @apps/web build

if [ $? -eq 0 ]; then
    echo "✅ 웹 앱 빌드 성공!"
    echo ""
    echo "📋 수정된 내용:"
    echo "- ✅ createCourse API 타입에 필수 필드 추가"
    echo "- ✅ handleCreateCourse 함수에서 필수 필드 전송"
    echo "- ✅ 기본값으로 '새 강의', '기타', 'Beginner' 설정"
    echo ""
    echo "🎯 이제 강의 생성 버튼을 클릭하면 정상 동작할 것입니다!"
    echo "테스트 방법:"
    echo "1. 웹 앱 실행: pnpm dev:web"
    echo "2. Teacher > Courses 페이지 이동"
    echo "3. 'Create Course' 버튼 클릭"
else
    echo "❌ 웹 앱 빌드 실패"
    exit 1
fi
