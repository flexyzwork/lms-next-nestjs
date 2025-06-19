// 토큰 관리 유틸리티
import type { AuthTokens } from '@packages/schemas';

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  static setTokens(accessToken: string, refreshToken: string): void;
  static setTokens(tokens: AuthTokens): void;
  static setTokens(accessTokenOrTokens: string | AuthTokens, refreshToken?: string): void {
    if (typeof window !== 'undefined') {
      if (typeof accessTokenOrTokens === 'string') {
        // setTokens(accessToken, refreshToken) 형태
        localStorage.setItem(this.ACCESS_TOKEN_KEY, accessTokenOrTokens);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken!);
      } else {
        // setTokens(tokens) 형태
        localStorage.setItem(this.ACCESS_TOKEN_KEY, accessTokenOrTokens.accessToken);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, accessTokenOrTokens.refreshToken);
      }
    }
  }

  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  static clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
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
