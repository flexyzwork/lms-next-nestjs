import { createId } from '@paralleldrive/cuid2';

// 🆔 CUID2 기반 ID 생성 유틸리티
export const genId = (): string => {
  return createId();
};

// 여러 개 ID 생성
export const genIds = (count: number): string[] => {
  return Array.from({ length: count }, () => createId());
};

// 호환성을 위한 별칭
export const generateId = genId;
export const generateIds = genIds;
