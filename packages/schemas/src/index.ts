// ==============================
// 📋 통합 스키마 라이브러리 (클라이언트/서버 공통)
// ==============================

// 기본 스키마
export * from './base';

// 인증 스키마
export * from './auth';

// API 스키마 (기존 common 패키지에서 이전)
export * from './api';

// 웹 UI 전용 스키마
// export * from './ui';

// 유틸리티 함수들
export function validateEmail(email: string): { isValid: boolean; errors: string[] } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const errors: string[] = [];

  if (!email) {
    errors.push('이메일을 입력해주세요');
  } else {
    if (email.length > 255) errors.push('이메일은 255자를 초과할 수 없습니다');
    if (!emailRegex.test(email)) errors.push('올바른 이메일 형식이 아닙니다');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password) {
    errors.push('비밀번호를 입력해주세요');
  } else {
    if (password.length < 8) errors.push('비밀번호는 최소 8자 이상이어야 합니다');
    if (password.length > 128) errors.push('비밀번호는 128자를 초과할 수 없습니다');

    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (!hasLowerCase || !hasUpperCase || !hasNumbers || !hasSpecialChar) {
      errors.push('비밀번호는 대소문자, 숫자, 특수문자(@$!%*?&)를 포함해야 합니다');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isValidCuid2(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.length !== 24) return false;
  const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
  return cuid2Regex.test(id);
}
