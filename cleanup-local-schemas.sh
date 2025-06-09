#!/bin/bash

echo "🗑️ 로컬 스키마 파일들 정리"
echo "=========================="

cd /Users/codelab/github_repos/lms-next-nestjs/apps/web/src/lib

echo "📋 삭제할 파일들:"
ls -la | grep -E "(schema|auth-utils)"

echo ""
echo "🔥 로컬 스키마 파일들 삭제..."

# auth-utils.ts 삭제
if [ -f "auth-utils.ts" ]; then
    rm auth-utils.ts
    echo "✅ auth-utils.ts 삭제됨"
fi

# common-schemas.ts 삭제  
if [ -f "common-schemas.ts" ]; then
    rm common-schemas.ts
    echo "✅ common-schemas.ts 삭제됨"
fi

# zodSchema.ts 삭제 (만약 있다면)
if [ -f "zodSchema.ts" ]; then
    rm zodSchema.ts
    echo "✅ zodSchema.ts 삭제됨"
fi

echo ""
echo "📁 남은 파일들:"
ls -la | grep schema

echo ""
echo "✅ 정리 완료!"
echo ""
echo "📋 변경사항 요약:"
echo "- 로컬 스키마 파일들 삭제"
echo "- schemas.ts는 @packages/schemas를 import하도록 수정"
echo "- AuthProvider.tsx는 로컬 auth-utils.ts 대신 @packages/schemas 사용"
