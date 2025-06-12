// ==============================
// 🔐 개선된 인증 서비스
// 새로운 API 클라이언트와 통합 타입을 사용
// ==============================

import { useAuthStore } from '@/stores/authStore';
import { authApi, AuthApiClient, ApiError } from '@/lib/api-client';
import type { 
  AuthUser, 
  AuthTokens, 
  LoginDto, 
  RegisterDto 
} from '@packages/schemas';

/**
 * 회원가입
 */
export async function registerUser(email: string, password: string) {
  try {
    const registerData: RegisterDto = { email, password };
    const result = await authApi.register(registerData);
    
    console.log('✅ 회원가입 성공:', result.user.email);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('❌ 회원가입 실패:', error);
    
    if (error instanceof ApiError) {
      return { 
        errors: error.response.errors?.map(e => e.message) || [error.message] 
      };
    }
    
    return { errors: ['네트워크 오류가 발생했습니다. 다시 시도해주세요.'] };
  }
}

/**
 * 로그인
 */
export async function loginUser(email: string, password: string) {
  const { login } = useAuthStore.getState();
  
  try {
    const loginData: LoginDto = { email, password };
    const result = await authApi.login(loginData);
    
    // Zustand 스토어에 로그인 정보 저장
    login(result.user, result.tokens);
    
    console.log('✅ 로그인 성공:', result.user.email);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('❌ 로그인 실패:', error);
    
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    
    return { error: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' };
  }
}

/**
 * 로그아웃
 */
export async function logoutUser() {
  const { logout } = useAuthStore.getState();

  try {
    await authApi.logout();
    console.log('✅ 서버 로그아웃 성공');
  } catch (error) {
    console.warn('⚠️ 서버 로그아웃 실패 (클라이언트 로그아웃 진행):', error);
  } finally {
    // 서버 요청 성공/실패와 관계없이 클라이언트 상태 정리
    logout();
    
    // 쿠키 정리
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // 로그인 페이지로 이동
    window.location.href = '/signin';
  }
}

/**
 * 토큰 새로고침
 */
export async function refreshAccessToken() {
  try {
    const result = await authApi.refreshTokens();
    console.log('✅ 토큰 새로고침 성공');
    return { user: result.user, token: result.tokens.accessToken };
  } catch (error) {
    console.error('❌ 토큰 새로고침 실패:', error);
    return null;
  }
}

/**
 * 프로필 조회 (토큰 검증 포함)
 */
export async function fetchProfile() {
  const { accessToken } = useAuthStore.getState();
  
  if (!accessToken) {
    return null;
  }

  try {
    // 토큰 새로고침을 통한 프로필 복구
    const result = await refreshAccessToken();
    return result;
  } catch (error) {
    console.error('❌ 프로필 조회 실패:', error);
    return null;
  }
}

/**
 * 프로필 업데이트
 */
export async function updateProfile(profileData: Partial<AuthUser>) {
  try {
    const updatedUser = await authApi.updateProfile(profileData);
    
    // 스토어 업데이트
    const { setUser } = useAuthStore.getState();
    setUser(updatedUser);
    
    console.log('✅ 프로필 업데이트 성공');
    return updatedUser;
  } catch (error) {
    console.error('❌ 프로필 업데이트 실패:', error);
    throw error;
  }
}

/**
 * 인증이 필요한 API 호출을 위한 헬퍼 (하위 호환성)
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  console.warn('⚠️ fetchWithAuth는 deprecated됩니다. AuthenticatedApiClient.call을 사용하세요.');
  
  const { accessToken } = useAuthStore.getState();
  
  if (!accessToken) {
    console.error('❌ 인증 토큰이 없습니다.');
    return null;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      console.warn('🔄 토큰 만료, 새로고침 시도...');
      const refreshResult = await refreshAccessToken();
      
      if (refreshResult?.token) {
        // 새 토큰으로 재시도
        return fetchWithAuth(url, options);
      } else {
        // 토큰 새로고침 실패
        const { logout } = useAuthStore.getState();
        logout();
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('❌ API 요청 실패:', error);
    throw error;
  }
}
