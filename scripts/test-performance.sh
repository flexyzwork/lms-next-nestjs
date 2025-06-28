#!/bin/bash

# 📊 성능 모니터링 시스템 테스트 스크립트

echo "🧪 LMS 성능 모니터링 시스템 테스트 시작"
echo "============================================"

API_BASE_URL="http://localhost:4001/api/v1"

# 1. 기본 요청으로 성능 데이터 생성
echo "1. 기본 API 요청으로 성능 데이터 생성 중..."
for i in {1..5}; do
  curl -s "${API_BASE_URL}/courses" > /dev/null
  curl -s "${API_BASE_URL}/user-course-progress/test-user/test-course" > /dev/null
  echo "  요청 $i/5 완료"
done

echo ""

# 2. 성능 메트릭 조회
echo "2. 📊 성능 메트릭 조회 테스트"
echo "--------------------------------"
response=$(curl -s "${API_BASE_URL}/admin/performance/metrics")
echo $response | jq '.' 2>/dev/null || echo "응답: $response"

echo ""

# 3. 느린 엔드포인트 분석
echo "3. 🐌 느린 엔드포인트 분석 테스트"
echo "--------------------------------"
response=$(curl -s "${API_BASE_URL}/admin/performance/slow-endpoints?limit=5&threshold=500")
echo $response | jq '.' 2>/dev/null || echo "응답: $response"

echo ""

# 4. 메모리 사용량 조회
echo "4. 💾 메모리 사용량 조회 테스트"
echo "--------------------------------"
response=$(curl -s "${API_BASE_URL}/admin/performance/memory-usage?period=1h")
echo $response | jq '.data.current' 2>/dev/null || echo "응답: $response"

echo ""

# 5. 시스템 헬스체크
echo "5. 🔍 시스템 헬스체크 테스트"
echo "--------------------------------"
response=$(curl -s "${API_BASE_URL}/admin/performance/health")
echo $response | jq '.data' 2>/dev/null || echo "응답: $response"

echo ""
echo "✅ 성능 모니터링 시스템 테스트 완료!"
echo ""
echo "📝 추가 테스트 방법:"
echo "  - LOG_PERFORMANCE=true로 설정하고 서버 재시작"
echo "  - 브라우저에서 http://localhost:4001/api/v1/admin/performance/metrics 접속"
echo "  - API 요청을 여러 번 보낸 후 느린 엔드포인트 확인"
