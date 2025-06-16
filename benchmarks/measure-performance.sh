#!/bin/bash

# 🔬 LMS 프로젝트 성능 측정 스크립트
# 실제 빌드 시간, 번들 크기, 서버 응답 시간 등을 측정합니다.

echo "🚀 LMS 프로젝트 성능 측정 시작"
echo "================================="

# 결과 저장용 디렉토리
BENCHMARK_DIR="/Users/codelab/github_repos/lms-next-nestjs/benchmarks"
RESULTS_FILE="${BENCHMARK_DIR}/performance-results.json"
PROJECT_ROOT="/Users/codelab/github_repos/lms-next-nestjs"

cd "$PROJECT_ROOT"

# JSON 결과 파일 초기화
echo "{" > "$RESULTS_FILE"
echo '  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",' >> "$RESULTS_FILE"
echo '  "measurements": {' >> "$RESULTS_FILE"

echo "📊 1. 빌드 시간 측정"
echo "==================="

# 캐시 클리어
echo "🧹 캐시 클리어 중..."
rm -rf .turbo
rm -rf apps/*/dist
rm -rf apps/*/.next
rm -rf packages/*/dist

# 첫 번째 빌드 (콜드 빌드)
echo "❄️  콜드 빌드 시간 측정..."
COLD_BUILD_START=$(date +%s.%N)
pnpm build 2>/dev/null >/dev/null
COLD_BUILD_END=$(date +%s.%N)
COLD_BUILD_TIME=$(echo "$COLD_BUILD_END - $COLD_BUILD_START" | bc)

echo "   콜드 빌드 시간: ${COLD_BUILD_TIME}초"

# 두 번째 빌드 (캐시된 빌드)
echo "🔥 캐시된 빌드 시간 측정..."
CACHED_BUILD_START=$(date +%s.%N)
pnpm build 2>/dev/null >/dev/null
CACHED_BUILD_END=$(date +%s.%N)
CACHED_BUILD_TIME=$(echo "$CACHED_BUILD_END - $CACHED_BUILD_START" | bc)

echo "   캐시된 빌드 시간: ${CACHED_BUILD_TIME}초"

# 개별 패키지 빌드 시간
echo "📦 패키지별 빌드 시간 측정..."
PACKAGES_BUILD_START=$(date +%s.%N)
pnpm build:packages 2>/dev/null >/dev/null
PACKAGES_BUILD_END=$(date +%s.%N)
PACKAGES_BUILD_TIME=$(echo "$PACKAGES_BUILD_END - $PACKAGES_BUILD_START" | bc)

echo "   패키지 빌드 시간: ${PACKAGES_BUILD_TIME}초"

# 빌드 결과를 JSON에 저장
echo '    "build_times": {' >> "$RESULTS_FILE"
echo "      \"cold_build_seconds\": $COLD_BUILD_TIME," >> "$RESULTS_FILE"
echo "      \"cached_build_seconds\": $CACHED_BUILD_TIME," >> "$RESULTS_FILE"
echo "      \"packages_build_seconds\": $PACKAGES_BUILD_TIME," >> "$RESULTS_FILE"
echo "      \"cache_improvement_percent\": $(echo "scale=2; (($COLD_BUILD_TIME - $CACHED_BUILD_TIME) / $COLD_BUILD_TIME) * 100" | bc)" >> "$RESULTS_FILE"
echo '    },' >> "$RESULTS_FILE"

echo ""
echo "📏 2. 번들 크기 측정"
echo "=================="

# 번들 크기 측정
echo "📊 빌드된 파일 크기 분석..."

# Next.js 번들 크기 (web app)
WEB_BUNDLE_SIZE=0
if [ -d "apps/web/.next" ]; then
    WEB_BUNDLE_SIZE=$(du -sk apps/web/.next | cut -f1)
    echo "   Web 앱 번들 크기: ${WEB_BUNDLE_SIZE}KB"
fi

# Auth 서비스 번들 크기
AUTH_BUNDLE_SIZE=0
if [ -d "apps/auth/dist" ]; then
    AUTH_BUNDLE_SIZE=$(du -sk apps/auth/dist | cut -f1)
    echo "   Auth 서비스 번들 크기: ${AUTH_BUNDLE_SIZE}KB"
fi

# API 서비스 번들 크기
API_BUNDLE_SIZE=0
if [ -d "apps/api/dist" ]; then
    API_BUNDLE_SIZE=$(du -sk apps/api/dist | cut -f1)
    echo "   API 서비스 번들 크기: ${API_BUNDLE_SIZE}KB"
fi

# 패키지 번들 크기
PACKAGES_BUNDLE_SIZE=0
for package in packages/*/dist; do
    if [ -d "$package" ]; then
        SIZE=$(du -sk "$package" | cut -f1)
        PACKAGES_BUNDLE_SIZE=$((PACKAGES_BUNDLE_SIZE + SIZE))
    fi
done
echo "   패키지 번들 크기 합계: ${PACKAGES_BUNDLE_SIZE}KB"

TOTAL_BUNDLE_SIZE=$((WEB_BUNDLE_SIZE + AUTH_BUNDLE_SIZE + API_BUNDLE_SIZE + PACKAGES_BUNDLE_SIZE))
echo "   전체 번들 크기: ${TOTAL_BUNDLE_SIZE}KB"

# 번들 크기 결과를 JSON에 저장
echo '    "bundle_sizes": {' >> "$RESULTS_FILE"
echo "      \"web_app_kb\": $WEB_BUNDLE_SIZE," >> "$RESULTS_FILE"
echo "      \"auth_service_kb\": $AUTH_BUNDLE_SIZE," >> "$RESULTS_FILE"
echo "      \"api_service_kb\": $API_BUNDLE_SIZE," >> "$RESULTS_FILE"
echo "      \"packages_kb\": $PACKAGES_BUNDLE_SIZE," >> "$RESULTS_FILE"
echo "      \"total_kb\": $TOTAL_BUNDLE_SIZE" >> "$RESULTS_FILE"
echo '    },' >> "$RESULTS_FILE"

echo ""
echo "🔍 3. 코드 메트릭 측정"
echo "==================="

# 라인 수 계산
TOTAL_LINES=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v dist | grep -v .next | xargs wc -l | tail -1 | awk '{print $1}')
echo "   총 코드 라인 수: $TOTAL_LINES"

# TypeScript 파일 수
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v .next | wc -l)
echo "   TypeScript 파일 수: $TS_FILES"

# 패키지 수
PACKAGE_COUNT=$(find packages -name "package.json" | wc -l)
echo "   패키지 수: $PACKAGE_COUNT"

# 앱 수
APP_COUNT=$(find apps -name "package.json" | wc -l)
echo "   앱 수: $APP_COUNT"

# 코드 메트릭을 JSON에 저장
echo '    "code_metrics": {' >> "$RESULTS_FILE"
echo "      \"total_lines\": $TOTAL_LINES," >> "$RESULTS_FILE"
echo "      \"typescript_files\": $TS_FILES," >> "$RESULTS_FILE"
echo "      \"packages_count\": $PACKAGE_COUNT," >> "$RESULTS_FILE"
echo "      \"apps_count\": $APP_COUNT" >> "$RESULTS_FILE"
echo '    }' >> "$RESULTS_FILE"

# JSON 파일 종료
echo "  }" >> "$RESULTS_FILE"
echo "}" >> "$RESULTS_FILE"

echo ""
echo "✅ 성능 측정 완료!"
echo "📄 결과 파일: $RESULTS_FILE"
echo ""
echo "📊 요약 결과:"
echo "============"
echo "콜드 빌드: ${COLD_BUILD_TIME}초"
echo "캐시 빌드: ${CACHED_BUILD_TIME}초"
echo "캐시 개선율: $(echo "scale=1; (($COLD_BUILD_TIME - $CACHED_BUILD_TIME) / $COLD_BUILD_TIME) * 100" | bc)%"
echo "전체 번들: ${TOTAL_BUNDLE_SIZE}KB"
echo "총 코드 라인: $TOTAL_LINES"
