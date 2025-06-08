/**
 * 🆔 ID 생성 유틸리티
 * 
 * CUID2를 사용한 안전하고 충돌 방지 ID 생성
 * CUID2는 기본적으로 24자의 소문자+숫자 조합으로 구성됩니다.
 */

import { createId } from '@paralleldrive/cuid2';

/**
 * 새로운 CUID2 ID 생성
 * @returns 24자 CUID2 문자열 (예: "yefj4way7aurp2kamr0bwr8n")
 */
export function generateId(): string {
  const id = createId();
  
  // CUID2는 항상 24자여야 함을 보장
  if (id.length !== 24) {
    console.warn(`⚠️ 생성된 ID 길이가 비정상입니다: ${id} (길이: ${id.length})`);
    throw new Error(`CUID2 생성 오류: 예상 길이 24자, 실제 ${id.length}자`);
  }
  
  return id;
}

/**
 * CUID2 형식 검증 (엄격한 검증)
 * @param id 검증할 ID 문자열
 * @returns 유효한 CUID2인지 여부
 */
export function isValidCuid2(id: string): boolean {
  // CUID2는 정확히 24자, 첫 글자는 소문자, 나머지는 소문자+숫자
  const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
  
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // 길이 먼저 체크 (성능 최적화)
  if (id.length !== 24) {
    return false;
  }
  
  return cuid2Regex.test(id);
}

/**
 * ID 유형 감지
 * @param id 검증할 ID 문자열
 * @returns ID 유형 정보
 */
export function detectIdType(id: string): {
  type: 'cuid2' | 'invalid';
  length: number;
  valid: boolean;
  message: string;
} {
  if (!id || typeof id !== 'string') {
    return {
      type: 'invalid',
      length: 0,
      valid: false,
      message: 'ID가 제공되지 않았거나 문자열이 아닙니다'
    };
  }
  
  if (isValidCuid2(id)) {
    return {
      type: 'cuid2',
      length: id.length,
      valid: true,
      message: '유효한 CUID2 ID입니다'
    };
  }
  
  return {
    type: 'invalid',
    length: id.length,
    valid: false,
    message: `유효하지 않은 ID 형식입니다 (길이: ${id.length}, 예상: 24자 CUID2)`
  };
}

/**
 * 여러 개의 CUID2 ID를 한 번에 생성
 * @param count 생성할 ID 개수
 * @returns CUID2 ID 배열
 */
export function generateIds(count: number): string[] {
  if (count <= 0) {
    return [];
  }
  
  return Array.from({ length: count }, () => generateId());
}

/**
 * 타임스탬프가 포함된 CUID2 특성을 활용한 정렬
 * @param ids CUID2 ID 배열
 * @param order 정렬 순서 ('asc' | 'desc')
 * @returns 정렬된 ID 배열
 */
export function sortCuid2Ids(ids: string[], order: 'asc' | 'desc' = 'desc'): string[] {
  return [...ids].sort((a, b) => {
    if (order === 'desc') {
      return b.localeCompare(a);
    }
    return a.localeCompare(b);
  });
}

// 타입 정의
export type Cuid2 = string & { readonly __brand: unique symbol };

/**
 * 타입 안전한 CUID2 생성
 * @returns 타입이 보장된 CUID2
 */
export function generateTypedId(): Cuid2 {
  return generateId() as Cuid2;
}
