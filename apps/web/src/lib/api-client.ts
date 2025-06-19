// ==============================
// 🌐 통합 API 클라이언트
// 모든 API 호출을 표준화하고 중앙집중식으로 관리
// ==============================

import { useAuthStore } from '@/stores/authStore';
import type { 
  AuthUser, 
  AuthTokens, 
  LoginDto, 
  RegisterDto,
  AuthResponse 
} from '@packages/schemas';

// API 기본 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// 표준 API 응답 타입
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// API 에러 클래스
export class ApiError extends Error {
  constructor(
    public status: number,
    public response: ApiResponse,
    message?: string
  ) {
    super(message || response.message || '알 수 없는 오류가 발생했습니다');
    this.name = 'ApiError';
  }
}

// JWT 디코딩 유틸리티
function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT 디코딩 오류:', error);
    return null;
  }
}

// 기본 fetch 래퍼
async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    credentials: 'include',
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  console.log(`🌐 API 요청: ${config.method || 'GET'} ${url}`);
  console.log(`🔑 인증 토큰: ${accessToken ? '있음' : '없음'}`);
  
  const response = await fetch(url, config);
  
  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error(`❌ JSON 파싱 오류:`, error);
    throw new ApiError(response.status, { 
      success: false, 
      message: 'JSON 파싱 오류' 
    });
  }
  
  console.log(`📝 API 응답 (${response.status}):`, data);

  if (!response.ok) {
    console.error(`❌ API 오류 ${response.status}:`, data);
    throw new ApiError(response.status, data);
  }

  console.log(`✅ API 성공: ${config.method || 'GET'} ${url}`);
  return data;
}

// 인증 관련 API 클라이언트
export class AuthApiClient {
  /**
   * 회원가입
   */
  static async register(data: RegisterDto): Promise<{ user: AuthUser }> {
    const response = await fetchApi<ApiResponse<{ user: AuthUser }>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.success || !response.data) {
      throw new Error('회원가입 응답 데이터가 올바르지 않습니다');
    }

    return response.data;
  }

  /**
   * 로그인
   */
  static async login(data: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const response = await fetchApi<ApiResponse<{ user: AuthUser; tokens: AuthTokens }>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.success || !response.data) {
      throw new Error('로그인 응답 데이터가 올바르지 않습니다');
    }

    const { user, tokens } = response.data;
    
    // JWT 토큰에서 사용자 정보 추출 및 정규화
    const decodedToken = decodeJWT(tokens.accessToken);
    if (!decodedToken) {
      throw new Error('토큰을 디코딩할 수 없습니다');
    }

    // AuthUser 타입에 맞게 사용자 정보 정규화
    const normalizedUser: AuthUser = {
      id: user.id || decodedToken.userId || decodedToken.sub,
      email: user.email || decodedToken.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role || decodedToken.role || 'USER',
      isActive: user.isActive !== undefined ? user.isActive : true,
      isVerified: user.isVerified !== undefined ? user.isVerified : false,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt,
    };

    return { user: normalizedUser, tokens };
  }

  /**
   * 로그아웃
   */
  static async logout(): Promise<void> {
    await fetchApi('/api/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * 토큰 새로고침
   */
  static async refreshTokens(): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const response = await fetchApi<ApiResponse<AuthTokens>>('/api/auth/refresh', {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error('토큰 새로고침 실패');
    }

    const tokens = response.data;
    const decodedToken = decodeJWT(tokens.accessToken);
    const currentUser = useAuthStore.getState().user;

    if (!decodedToken || !currentUser) {
      throw new Error('토큰 또는 사용자 정보가 없습니다');
    }

    // 현재 사용자 정보를 새 토큰 정보로 업데이트
    const updatedUser: AuthUser = {
      ...currentUser,
      id: currentUser.id || decodedToken.userId || decodedToken.sub,
      email: decodedToken.email || currentUser.email,
      role: decodedToken.role || currentUser.role,
    };

    return { user: updatedUser, tokens };
  }

  /**
   * 사용자 프로필 조회
   */
  static async getProfile(): Promise<AuthUser> {
    const response = await fetchApi<ApiResponse<AuthUser>>('/api/auth/profile');

    if (!response.success || !response.data) {
      throw new Error('프로필 조회 실패');
    }

    return response.data;
  }

  /**
   * 프로필 업데이트
   */
  static async updateProfile(data: Partial<AuthUser>): Promise<{ user: AuthUser; tokens?: AuthTokens; message: string }> {
    console.log('🔄 프로필 업데이트 API 요청:', data);
    
    const response = await fetchApi<ApiResponse<{ user: AuthUser; tokens?: AuthTokens }>>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    console.log('📝 프로필 업데이트 응답:', response);

    if (!response.success) {
      throw new Error(response.message || '프로필 업데이트 실패');
    }

    if (!response.data || !response.data.user) {
      console.error('❌ 잘못된 응답 구조:', response);
      throw new Error('서버 응답 데이터가 올바르지 않습니다');
    }

    const result = {
      user: response.data.user,
      tokens: response.data.tokens,
      message: response.message
    };

    console.log('✅ 프로필 업데이트 결과:', result);

    // 새 토큰이 있으면 스토어 업데이트
    if (result.tokens) {
      console.log('🔄 새 토큰으로 로그인 상태 업데이트');
      const { login } = useAuthStore.getState();
      login(result.user, result.tokens);
    } else {
      console.log('📝 사용자 정보만 업데이트');
      // 토큰이 없으면 사용자 정보만 업데이트
      const { setUser } = useAuthStore.getState();
      setUser(result.user);
    }

    return result;
  }
}

// 자동 재시도 및 토큰 갱신이 포함된 인증 API 클라이언트
export class AuthenticatedApiClient {
  private static async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 1
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && maxRetries > 0) {
        console.log('🔄 토큰 만료, 자동 갱신 시도...');
        
        try {
          const { user, tokens } = await AuthApiClient.refreshTokens();
          const { login } = useAuthStore.getState();
          login(user, tokens);
          
          console.log('✅ 토큰 갱신 성공, API 재시도');
          return await this.executeWithRetry(apiCall, maxRetries - 1);
        } catch (refreshError) {
          console.error('❌ 토큰 갱신 실패:', refreshError);
          // 토큰 갱신 실패 시 로그아웃 처리
          const { logout } = useAuthStore.getState();
          logout();
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
      }
      throw error;
    }
  }

  /**
   * 인증이 필요한 API 호출
   */
  static async call<T>(apiCall: () => Promise<T>): Promise<T> {
    return this.executeWithRetry(apiCall);
  }
}

// 편의를 위한 기본 export
export const authApi = AuthApiClient;
export const authenticatedApi = AuthenticatedApiClient;

// 기존 호환성을 위한 export (점진적 마이그레이션)
export { fetchApi as fetchWithAuth };
