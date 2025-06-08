// ==============================
// 🔐 인증 관련 유틸리티 함수들
// ==============================

// 토큰 관리 유틸리티
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly TOKEN_PREFIX = 'lms_';

  static setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_PREFIX + this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.TOKEN_PREFIX + this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_PREFIX + this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_PREFIX + this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  static clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_PREFIX + this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_PREFIX + this.REFRESH_TOKEN_KEY);
    }
  }

  static hasTokens(): boolean {
    return this.getAccessToken() !== null && this.getRefreshToken() !== null;
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      // 30초 여유를 두고 체크
      return payload.exp < (currentTime + 30);
    } catch {
      return true;
    }
  }

  static getTokenPayload(token: string): any | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  static isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    return parts.length === 3;
  }

  static getTokenExpiryDate(token: string): Date | null {
    const payload = this.getTokenPayload(token);
    if (!payload || !payload.exp) return null;
    return new Date(payload.exp * 1000);
  }
}

// 비밀번호 검증 유틸리티
export class PasswordValidator {
  static validateStrength(password: string) {
    if (!password) {
      return {
        score: 0,
        strength: 'none' as const,
        checks: {
          length: false,
          lowercase: false,
          uppercase: false,
          numbers: false,
          symbols: false,
        },
        suggestions: ['비밀번호를 입력해주세요'],
      };
    }

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

    let strength: 'none' | 'weak' | 'medium' | 'strong';
    if (score === 0) strength = 'none';
    else if (score <= 2) strength = 'weak';
    else if (score <= 4) strength = 'medium';
    else strength = 'strong';

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
      case 'none':
        return '없음';
      case 'weak':
        return '약함';
      case 'medium':
        return '보통';
      case 'strong':
        return '강함';
      default:
        return '알 수 없음';
    }
  }

  static getStrengthProgress(strength: string): number {
    switch (strength) {
      case 'weak':
        return 25;
      case 'medium':
        return 60;
      case 'strong':
        return 100;
      default:
        return 0;
    }
  }
}

// 폼 검증 헬퍼
export class FormValidator {
  static validateEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return '이메일을 입력해주세요';
    if (email.length > 255) return '이메일은 255자를 초과할 수 없습니다';
    if (!emailRegex.test(email)) return '올바른 이메일 형식이 아닙니다';
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
      return '비밀번호는 대소문자, 숫자, 특수문자(@$!%*?&)를 포함해야 합니다';
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

  static validateConfirmPassword(password: string, confirmPassword: string): string | null {
    if (!confirmPassword) return '비밀번호 확인을 입력해주세요';
    if (password !== confirmPassword) return '비밀번호가 일치하지 않습니다';
    return null;
  }

  static validateName(name: string, fieldName: string = '이름'): string | null {
    if (!name) return null; // 이름은 optional
    if (name.length > 50) return `${fieldName}은 50자를 초과할 수 없습니다`;
    if (!/^[가-힣a-zA-Z\s]+$/.test(name)) {
      return `${fieldName}은 한글, 영문, 공백만 사용할 수 있습니다`;
    }
    return null;
  }

  static validatePhone(phone: string): string | null {
    if (!phone) return null; // 전화번호는 optional
    const phoneRegex = /^(\+82|0)?(10|11|16|17|18|19)\d{8}$/;
    if (!phoneRegex.test(phone.replace(/[^0-9+]/g, ''))) {
      return '올바른 한국 휴대폰 번호 형식이 아닙니다 (예: 010-1234-5678)';
    }
    return null;
  }

  static validateUrl(url: string, fieldName: string = 'URL'): string | null {
    if (!url) return null; // URL은 optional
    try {
      new URL(url);
      return null;
    } catch {
      return `올바른 ${fieldName} 형식이 아닙니다`;
    }
  }
}

// 인증 상태 관리 유틸리티
export class AuthStateManager {
  private static readonly USER_KEY = 'lms_user';

  static setUser(user: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  static getUser(): any | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(this.USER_KEY);
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  static clearUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  static isLoggedIn(): boolean {
    const user = this.getUser();
    const accessToken = TokenManager.getAccessToken();
    
    if (!user || !accessToken) return false;
    if (!TokenManager.isValidTokenFormat(accessToken)) return false;
    if (TokenManager.isTokenExpired(accessToken)) return false;
    
    return true;
  }

  static getUserRole(): string | null {
    const user = this.getUser();
    return user?.role || null;
  }

  static isInstructor(): boolean {
    return this.getUserRole() === 'INSTRUCTOR';
  }

  static isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN';
  }

  static canAccessAdminFeatures(): boolean {
    return this.isAdmin();
  }

  static canCreateCourse(): boolean {
    return this.isInstructor() || this.isAdmin();
  }

  static logout(): void {
    TokenManager.clearTokens();
    this.clearUser();
    
    // 현재 페이지가 보호된 페이지라면 로그인 페이지로 리다이렉트
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
      window.location.href = '/login';
    }
  }
}

// 보안 유틸리티
export class SecurityUtils {
  // CSRF 토큰 생성 (간단한 버전)
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // 민감한 데이터 마스킹
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    
    const maskedLocal = local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
    return `${maskedLocal}@${domain}`;
  }

  static maskPhone(phone: string): string {
    if (!phone) return phone;
    
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) return phone;
    
    const start = cleanPhone.slice(0, 3);
    const middle = '*'.repeat(4);
    const end = cleanPhone.slice(-4);
    
    return `${start}-${middle}-${end}`;
  }

  // XSS 방지를 위한 HTML 이스케이프
  static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 안전한 파싱
  static safeJsonParse(jsonString: string): any | null {
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }
}

// 세션 관리 유틸리티 
export class SessionManager {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30분
  private static readonly ACTIVITY_KEY = 'lms_last_activity';
  private static readonly WARNING_TIME = 5 * 60 * 1000; // 5분 전 경고

  static updateActivity(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.ACTIVITY_KEY, Date.now().toString());
    }
  }

  static getLastActivity(): number {
    if (typeof window !== 'undefined') {
      const activity = localStorage.getItem(this.ACTIVITY_KEY);
      return activity ? parseInt(activity, 10) : Date.now();
    }
    return Date.now();
  }

  static isSessionExpired(): boolean {
    const lastActivity = this.getLastActivity();
    const now = Date.now();
    return (now - lastActivity) > this.SESSION_TIMEOUT;
  }

  static shouldShowWarning(): boolean {
    const lastActivity = this.getLastActivity();
    const now = Date.now();
    const timeLeft = this.SESSION_TIMEOUT - (now - lastActivity);
    return timeLeft <= this.WARNING_TIME && timeLeft > 0;
  }

  static getTimeUntilExpiry(): number {
    const lastActivity = this.getLastActivity();
    const now = Date.now();
    const timeLeft = this.SESSION_TIMEOUT - (now - lastActivity);
    return Math.max(0, timeLeft);
  }

  static formatTimeLeft(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  static extendSession(): void {
    this.updateActivity();
  }

  static startActivityMonitoring(): void {
    if (typeof window !== 'undefined') {
      // 사용자 활동 감지
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const updateActivity = () => this.updateActivity();
      
      events.forEach(event => {
        document.addEventListener(event, updateActivity, true);
      });

      // 페이지 언로드 시 정리
      window.addEventListener('beforeunload', () => {
        events.forEach(event => {
          document.removeEventListener(event, updateActivity, true);
        });
      });

      // 초기 활동 기록
      this.updateActivity();
    }
  }
}

// 디바이스 정보 유틸리티
export class DeviceUtils {
  static getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'Unknown';
    
    const userAgent = navigator.userAgent;
    let deviceInfo = 'Unknown Device';
    
    if (/Android/i.test(userAgent)) {
      deviceInfo = 'Android Device';
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      deviceInfo = 'iOS Device';
    } else if (/Windows/i.test(userAgent)) {
      deviceInfo = 'Windows PC';
    } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
      deviceInfo = 'Mac';
    } else if (/Linux/i.test(userAgent)) {
      deviceInfo = 'Linux PC';
    }
    
    return deviceInfo;
  }

  static getBrowserInfo(): string {
    if (typeof window === 'undefined') return 'Unknown Browser';
    
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown Browser';
  }

  static isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  static isTablet(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
  }

  static isDesktop(): boolean {
    return !this.isMobile() && !this.isTablet();
  }
}
