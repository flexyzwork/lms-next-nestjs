import { courseQuerySchema } from '@packages/common';

// 테스트 케이스들
const testCases = [
  // 빈 객체 (문제가 되었던 케이스)`
  {},

  // 정상적인 쿼리
  {
    page: '1',
    limit: '10',
    category: 'programming',
    minPrice: '10000',
    maxPrice: '50000'
  },

  // 가격 필드가 없는 경우
  {
    page: '1',
    limit: '10',
    search: 'JavaScript'
  },

  // 빈 문자열 가격
  {
    page: '1',
    limit: '10',
    minPrice: '',
    maxPrice: ''
  }
];

console.log('📋 스키마 검증 테스트');
console.log('==================');

testCases.forEach((testCase, index) => {
  console.log(`\n테스트 ${index + 1}:`, testCase);

  try {
    const result = courseQuerySchema.parse(testCase);
    console.log('✅ 성공:', result);
  } catch (error) {
    console.log('❌ 실패:', error.errors || error.message);
  }
});
