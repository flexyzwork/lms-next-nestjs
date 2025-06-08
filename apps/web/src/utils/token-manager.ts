/**
 * 🔄 클라이언트 토큰 자동 갱신 유틸리티
 * 
 * 서버에서 보내는 헤더 정보를 기반으로 토큰을 자동으로 갱신하거나
 * 사용자에게 적절한 안내를 제공합니다.
 */

/** 토큰 갱신 API 응답 인터페이스 */
interface TokenRefreshResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
    tokenType?: string;
  };
  message?: string;
  error?: string;
}

/** 토큰 상태 관리 인터페이스 */
interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isRefreshing: boolean;
  lastRefreshAt: number | null;
}

/** 토큰 관련 이벤트 타입 */
type TokenEvent = 'refreshed' | 'expired' | 'cleared' | 'error';

/** 이벤트 콜백 타입 */
type TokenEventCallback = (event: TokenEvent, data?: any) => void;

// 토큰 상태 관리
let tokenState: TokenState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  isRefreshing: false,
  lastRefreshAt: null,
};

// 갱신 중인 프로미스 (중복 갱신 방지)
let refreshPromise: Promise<boolean> | null = null;

// 이벤트 리스너들
const eventListeners: Map<TokenEvent, Set<TokenEventCallback>> = new Map();

// 설정 상수
const CONFIG = {
  REFRESH_THRESHOLD_MINUTES: 5, // 만료 5분 전 갱신
  MAX_RETRY_COUNT: 3, // 최대 재시도 횟수
  RETRY_DELAY_MS: 1000, // 재시도 지연 시간
  MONITORING_INTERVAL_MS: 60000, // 모니터링 주기 (1분)
  MIN_REFRESH_INTERVAL_MS: 30000, // 최소 갱신 간격 (30초)
} as const;

/**
 * 토큰 이벤트 리스너 등록
 */
export function addTokenEventListener(event: TokenEvent, callback: TokenEventCallback): void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(callback);
}

/**
 * 토큰 이벤트 리스너 제거
 */
export function removeTokenEventListener(event: TokenEvent, callback: TokenEventCallback): void {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.delete(callback);
  }
}

/**
 * 토큰 이벤트 발생
 */
function emitTokenEvent(event: TokenEvent, data?: any): void {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('토큰 이벤트 콜백 실행 중 오류:', error);
      }
    });
  }
}

/**
 * 안전한 로컬 스토리지 접근
 */
function safeLocalStorage() {
  try {
    return typeof window !== 'undefined' && window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 토큰 상태 초기화
 */
export function initializeTokens(
  accessToken: string, 
  refreshToken: string, 
  expiresIn?: number
): void {
  if (!accessToken || !refreshToken) {
    throw new Error('액세스 토큰과 리프레시 토큰이 모두 필요합니다');
  }

  const now = Date.now();
  tokenState.accessToken = accessToken;
  tokenState.refreshToken = refreshToken;
  tokenState.lastRefreshAt = now;
  
  if (expiresIn && expiresIn > 0) {
    tokenState.expiresAt = now + (expiresIn * 1000);
  }
  
  // 로컬 스토리지에 안전하게 저장
  const localStorage = safeLocalStorage();
  if (localStorage) {
    try {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('lastRefreshAt', now.toString());
      
      if (tokenState.expiresAt) {
        localStorage.setItem('tokenExpiresAt', tokenState.expiresAt.toString());
      }
    } catch (error) {
      console.warn('로컬 스토리지 저장 실패:', error);
    }
  }
  
  console.log('🔑 토큰 초기화 완료', {
    expiresAt: tokenState.expiresAt ? new Date(tokenState.expiresAt).toISOString() : '없음'
  });
  
  emitTokenEvent('refreshed', { accessToken, expiresAt: tokenState.expiresAt });
}

/**
 * 저장된 토큰 로드
 */
export function loadStoredTokens(): boolean {
  const localStorage = safeLocalStorage();
  if (!localStorage) {
    return false;
  }

  try {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    const lastRefreshAt = localStorage.getItem('lastRefreshAt');
    
    if (accessToken && refreshToken) {
      tokenState.accessToken = accessToken;
      tokenState.refreshToken = refreshToken;
      tokenState.expiresAt = expiresAt ? parseInt(expiresAt) : null;
      tokenState.lastRefreshAt = lastRefreshAt ? parseInt(lastRefreshAt) : null;
      
      // 토큰이 이미 만료되었는지 확인
      if (tokenState.expiresAt && Date.now() >= tokenState.expiresAt) {
        console.warn('⚠️ 저장된 토큰이 이미 만료됨');
        clearTokens();
        return false;
      }
      
      console.log('🔄 저장된 토큰 로드 완료');
      return true;
    }
  } catch (error) {
    console.error('저장된 토큰 로드 실패:', error);
    clearTokens();
  }
  
  return false;
}

/**
 * 현재 액세스 토큰 반환
 */
export function getAccessToken(): string | null {
  return tokenState.accessToken;
}

/**
 * 현재 리프레시 토큰 반환
 */
export function getRefreshToken(): string | null {
  return tokenState.refreshToken;
}

/**
 * 토큰 만료 여부 확인
 */
export function isTokenExpired(): boolean {
  if (!tokenState.expiresAt) return false;
  return Date.now() >= tokenState.expiresAt;
}

/**
 * 토큰 갱신 필요 여부 확인 (만료 N분 전)
 */
export function shouldRefreshToken(): boolean {
  if (!tokenState.expiresAt || tokenState.isRefreshing) return false;
  
  const thresholdMs = CONFIG.REFRESH_THRESHOLD_MINUTES * 60 * 1000;
  const shouldRefresh = Date.now() >= (tokenState.expiresAt - thresholdMs);
  
  // 최소 갱신 간격 확인 (너무 자주 갱신하지 않도록)
  if (shouldRefresh && tokenState.lastRefreshAt) {
    const timeSinceLastRefresh = Date.now() - tokenState.lastRefreshAt;
    if (timeSinceLastRefresh < CONFIG.MIN_REFRESH_INTERVAL_MS) {
      return false;
    }
  }
  
  return shouldRefresh;
}

/**
 * 토큰 갱신 실행 (재시도 로직 포함)
 */
export async function refreshTokens(): Promise<boolean> {
  // 이미 갱신 중이면 기존 프로미스 반환
  if (refreshPromise) {
    return refreshPromise;
  }
  
  if (!tokenState.refreshToken) {
    console.warn('⚠️ 리프레시 토큰이 없습니다');
    emitTokenEvent('error', { reason: 'no-refresh-token' });
    return false;
  }
  
  console.log('🔄 토큰 갱신 시작');
  tokenState.isRefreshing = true;
  
  refreshPromise = performTokenRefresh();
  
  try {
    const result = await refreshPromise;
    return result;
  } finally {
    tokenState.isRefreshing = false;
    refreshPromise = null;
  }
}

/**
 * 실제 토큰 갱신 로직 (재시도 포함)
 */
async function performTokenRefresh(): Promise<boolean> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_COUNT; attempt++) {
    try {
      console.log(`🔄 토큰 갱신 시도 ${attempt}/${CONFIG.MAX_RETRY_COUNT}`);
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: tokenState.refreshToken,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`토큰 갱신 실패: ${response.status} ${response.statusText}`);
      }
      
      const result: TokenRefreshResponse = await response.json();
      
      if (result.success && result.data) {
        // 새 토큰으로 업데이트
        initializeTokens(
          result.data.accessToken,
          result.data.refreshToken,
          result.data.expiresIn
        );
        
        console.log('✅ 토큰 갱신 성공');
        return true;
      } else {
        throw new Error(result.error || '토큰 갱신 응답이 유효하지 않습니다');
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ 토큰 갱신 시도 ${attempt} 실패:`, error);
      
      // 마지막 시도가 아니면 잠시 대기 후 재시도
      if (attempt < CONFIG.MAX_RETRY_COUNT) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS * attempt));
      }
    }
  }
  
  // 모든 시도 실패
  console.error('❌ 토큰 갱신 최종 실패:', lastError);
  emitTokenEvent('error', { reason: 'refresh-failed', error: lastError });
  
  // 갱신 실패 시 로그아웃 처리
  clearTokens();
  emitTokenEvent('expired');
  
  // 로그인 페이지로 리다이렉트
  if (typeof window !== 'undefined') {
    window.location.href = '/login?reason=token-expired';
  }
  
  return false;
}

/**
 * 토큰 클리어 (로그아웃)
 */
export function clearTokens(): void {
  tokenState = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    isRefreshing: false,
    lastRefreshAt: null,
  };
  
  const localStorage = safeLocalStorage();
  if (localStorage) {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('lastRefreshAt');
    } catch (error) {
      console.warn('로컬 스토리지 클리어 실패:', error);
    }
  }
  
  console.log('🗑️ 토큰 클리어 완료');
  emitTokenEvent('cleared');
}

/**
 * HTTP 응답 헤더 분석 및 자동 처리
 */
export function handleTokenHeaders(headers: Headers): void {
  const refreshRecommended = headers.get('X-Token-Refresh-Recommended');
  const tokenExpired = headers.get('X-Token-Expired');
  const refreshRequired = headers.get('X-Refresh-Required');
  const expiresIn = headers.get('X-Token-Expires-In');
  
  if (tokenExpired === 'true' && refreshRequired === 'true') {
    console.log('⚠️ 토큰 만료 감지 - 자동 갱신 시작');
    refreshTokens();
  } else if (refreshRecommended === 'true') {
    const remainingTime = expiresIn ? parseInt(expiresIn) : 0;
    console.log(`💡 토큰 갱신 권장 - ${remainingTime}초 후 만료`);
    
    // 임계값 미만 남았으면 자동 갱신
    const thresholdSeconds = CONFIG.REFRESH_THRESHOLD_MINUTES * 60;
    if (remainingTime < thresholdSeconds) {
      refreshTokens();
    }
  }
}

/**
 * Fetch 래퍼 함수 (자동 토큰 처리 포함)
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 토큰 갱신 필요 시 미리 갱신
  if (shouldRefreshToken() && !tokenState.isRefreshing) {
    console.log('🔄 미리 토큰 갱신 실행');
    await refreshTokens();
  }
  
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('인증 토큰이 없습니다');
  }
  
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  
  let response = await fetch(url, {
    ...options,
    headers,
  });
  
  // 응답 헤더 분석
  handleTokenHeaders(response.headers);
  
  // 인증 오류 시 토큰 갱신 시도
  if (response.status === 401) {
    try {
      const errorBody = await response.clone().json();
      
      if (errorBody.code === 'TOKEN_EXPIRED' || errorBody.message?.includes('expired')) {
        console.log('🔄 토큰 만료로 인한 401 - 갱신 후 재시도');
        
        const refreshed = await refreshTokens();
        if (refreshed) {
          // 새 토큰으로 재시도
          const newAccessToken = getAccessToken();
          if (newAccessToken) {
            headers.set('Authorization', `Bearer ${newAccessToken}`);
            response = await fetch(url, { ...options, headers });
          }
        }
      }
    } catch (parseError) {
      console.warn('401 응답 파싱 실패:', parseError);
    }
  }
  
  return response;
}

/**
 * 토큰 자동 갱신 모니터링 시작
 */
export function startTokenMonitoring(): () => void {
  // 페이지 로드 시 저장된 토큰 확인
  loadStoredTokens();
  
  // 주기적으로 토큰 상태 확인
  const intervalId = setInterval(() => {
    if (shouldRefreshToken() && !tokenState.isRefreshing) {
      console.log('⏰ 주기적 토큰 갱신 체크');
      refreshTokens();
    }
  }, CONFIG.MONITORING_INTERVAL_MS);
  
  console.log('🎯 토큰 자동 갱신 모니터링 시작');
  
  // 정리 함수 반환
  return () => {
    clearInterval(intervalId);
    console.log('🛑 토큰 모니터링 중지');
  };
}

/**
 * 현재 토큰 상태 반환 (디버깅용)
 */
export function getTokenState(): Readonly<TokenState> {
  return { ...tokenState };
}

/**
 * 토큰 만료까지 남은 시간 반환 (초)
 */
export function getTimeUntilExpiry(): number | null {
  if (!tokenState.expiresAt) return null;
  const remaining = tokenState.expiresAt - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
}

// 타입 정의 export
export type { 
  TokenRefreshResponse, 
  TokenState, 
  TokenEvent, 
  TokenEventCallback 
};
