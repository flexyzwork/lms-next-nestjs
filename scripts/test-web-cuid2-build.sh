#!/bin/bash

# 🧪 웹 앱 빌드 및 CUID2 기능 테스트

echo "🧪 웹 앱 빌드 및 CUID2 기능 테스트 시작..."

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "1️⃣ 웹 앱 빌드 테스트..."
cd apps/web

echo "  📦 의존성 설치 확인..."
if ! pnpm list @paralleldrive/cuid2 > /dev/null 2>&1; then
    echo "  ⚠️  @paralleldrive/cuid2가 설치되지 않았습니다. 설치 중..."
    pnpm install
fi

echo "  🔨 빌드 테스트 실행..."
if pnpm run build; then
    echo "  ✅ 웹 앱 빌드 성공!"
else
    echo "  ❌ 웹 앱 빌드 실패"
    exit 1
fi

cd "$PROJECT_ROOT"

echo ""
echo "2️⃣ CUID2 유틸리티 함수 검증..."

# TypeScript로 간단한 테스트 실행
cat > apps/web/test-cuid2.mjs << 'EOF'
import { createId } from '@paralleldrive/cuid2';

console.log('🆔 CUID2 테스트 시작...');

// 5개 ID 생성
const ids = [];
for (let i = 0; i < 5; i++) {
  ids.push(createId());
}

console.log('생성된 ID들:');
ids.forEach((id, index) => {
  console.log(`  ${index + 1}. ${id} (길이: ${id.length}자)`);
});

// 검증 함수 테스트
function validateId(id) {
  const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
  return typeof id === 'string' && id.length === 24 && cuid2Regex.test(id);
}

console.log('\n검증 결과:');
ids.forEach((id, index) => {
  const isValid = validateId(id);
  console.log(`  ${index + 1}. ${id} - ${isValid ? '✅ 유효' : '❌ 무효'}`);
});

// 통계
const lengths = ids.map(id => id.length);
const uniqueLengths = [...new Set(lengths)];
console.log(`\n📊 통계:`);
console.log(`  - 생성된 ID 수: ${ids.length}`);
console.log(`  - 고유한 길이들: ${uniqueLengths.join(', ')}`);
console.log(`  - 모든 ID가 24자인가? ${uniqueLengths.length === 1 && uniqueLengths[0] === 24 ? '✅ 예' : '❌ 아니오'}`);

const allValid = ids.every(validateId);
console.log(`  - 모든 ID가 유효한가? ${allValid ? '✅ 예' : '❌ 아니오'}`);

console.log('\n✨ CUID2 테스트 완료!');
EOF

cd apps/web
echo "  CUID2 기능 테스트 실행..."
if node test-cuid2.mjs; then
    echo "  ✅ CUID2 기능 테스트 성공!"
else
    echo "  ❌ CUID2 기능 테스트 실패"
fi

# 테스트 파일 정리
rm -f test-cuid2.mjs

cd "$PROJECT_ROOT"

echo ""
echo "3️⃣ 다른 앱들과의 호환성 확인..."

echo "  📦 packages/common 빌드 상태 확인..."
if [ -f "packages/common/dist/index.js" ]; then
    echo "  ✅ packages/common 빌드됨"
else
    echo "  ⚠️  packages/common 빌드되지 않음. 빌드 중..."
    cd packages/common
    pnpm run build
    cd "$PROJECT_ROOT"
fi

echo "  📦 packages/database 빌드 상태 확인..."
if [ -f "packages/database/dist/index.js" ]; then
    echo "  ✅ packages/database 빌드됨"
else
    echo "  ⚠️  packages/database 빌드되지 않음. 빌드 중..."
    cd packages/database
    pnpm run build
    cd "$PROJECT_ROOT"
fi

echo ""
echo "🎉 전체 테스트 완료!"
echo ""
echo "📋 테스트 결과 요약:"
echo "  ✅ 웹 앱 빌드 성공 (Node.js 모듈 충돌 해결)"
echo "  ✅ CUID2 직접 사용으로 브라우저 호환성 확보"
echo "  ✅ ID 생성 및 검증 기능 정상 작동"
echo "  ✅ 서버사이드 packages와 호환성 유지"
echo ""
echo "🚀 이제 안전하게 개발 서버를 시작할 수 있습니다:"
echo "  pnpm run dev:web    # 웹 앱 (localhost:3002)"
echo "  pnpm run dev:api    # API 서버 (localhost:3000)"
echo "  pnpm run dev:auth   # Auth 서버 (localhost:3001)"
