import { z } from 'zod';
import { RegisterDto, LoginDto } from './auth';

// ==============================
// 🔧 브라우저 타입 정의
// ==============================

// 브라우저 환경 검사 함수
function isBrowser(): boolean {
  return typeof (globalThis as any).window !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined';
}

// ==============================
// 🔧 Auth 유틸리티 클래스들
// ==============================

// 토큰 관리 유틸리티
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  static setTokens(accessToken: string, refreshToken: string): void {
    if (isBrowser()) {
      (globalThis as any).localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      (globalThis as any).localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  static getAccessToken(): string | null {
    if (isBrowser()) {
      return (globalThis as any).localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  static getRefreshToken(): string | null {
    if (isBrowser()) {
      return (globalThis as any).localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  static clearTokens(): void {
    if (isBrowser()) {
      (globalThis as any).localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      (globalThis as any).localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      // 브라우저 환경에서만 atob 사용
      if (typeof (globalThis as any).atob === 'undefined') {
        // Node.js 환경에서는 Buffer 사용
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const currentTime = Date.now() / 1000;
        return payload.exp < currentTime;
      } else {
        // 브라우저 환경에서는 atob 사용
        const payload = JSON.parse((globalThis as any).atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        return payload.exp < currentTime;
      }
    } catch {
      return true;
    }
  }
}

// Auth API 클라이언트
export class AuthApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.baseUrl}/api/v1/auth${endpoint}`;

    // fetch가 사용 가능한지 확인
    if (typeof fetch === 'undefined') {
      throw new Error('fetch is not available in this environment');
    }

    const response = await (globalThis as any).fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      // 오류 응답 처리
      const errorMessage = data.message || data.error || '요청에 실패했습니다';
      const error = new Error(errorMessage);

      // 추가 오류 정보 전달
      if (data.errors) {
        (error as any).errors = data.errors;
      }

      throw error;
    }

    return data;
  }

  async register(data: RegisterDto) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginDto) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(accessToken: string) {
    return this.request('/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async getProfile(accessToken: string) {
    return this.request('/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async checkPasswordStrength(password: string) {
    return this.request('/check-password-strength', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }
}

// 비밀번호 검증 유틸리티
export class PasswordValidator {
  static validateStrength(password: string) {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[@$!%*?&]/.test(password),
    };

    let score = 0;
    if (checks.length) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.numbers) score += 1;
    if (checks.symbols) score += 1;

    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

    return {
      score,
      strength,
      checks,
      suggestions: [
        !checks.length && '최소 8자 이상 입력하세요',
        !checks.lowercase && '소문자를 포함하세요',
        !checks.uppercase && '대문자를 포함하세요',
        !checks.numbers && '숫자를 포함하세요',
        !checks.symbols && '특수문자(@$!%*?&)를 포함하세요',
      ].filter(Boolean),
    };
  }

  static getStrengthColor(strength: string): string {
    switch (strength) {
      case 'weak':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'strong':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  }

  static getStrengthText(strength: string): string {
    switch (strength) {
      case 'weak':
        return '약함';
      case 'medium':
        return '보통';
      case 'strong':
        return '강함';
      default:
        return '없음';
    }
  }
}

// 폼 검증 헬퍼
export class FormValidator {
  static validateEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return '이메일을 입력해주세요';
    if (!emailRegex.test(email)) return '올바른 이메일 형식이 아닙니다';
    if (email.length > 255) return '이메일은 255자를 초과할 수 없습니다';
    return null;
  }

  static validatePassword(password: string): string | null {
    if (!password) return '비밀번호를 입력해주세요';
    if (password.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다';
    if (password.length > 128) return '비밀번호는 128자를 초과할 수 없습니다';
    
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (!hasLowerCase || !hasUpperCase || !hasNumbers || !hasSpecialChar) {
      return '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다';
    }

    return null;
  }

  static validateUsername(username: string): string | null {
    if (!username) return null; // username은 optional
    if (username.length < 3) return '사용자명은 최소 3자 이상이어야 합니다';
    if (username.length > 30) return '사용자명은 30자를 초과할 수 없습니다';
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return '사용자명은 영문, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다';
    }
    return null;
  }
}
