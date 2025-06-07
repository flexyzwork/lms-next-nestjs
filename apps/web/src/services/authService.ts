import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore.getState();

export async function registerUser(email: string, password: string) {
  const { login } = authStore;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }), // ✅ provider 제거
      credentials: 'include',
    });

    const responseData = await res.json();
    console.log('🚀 회원가입 응답 데이터 --->', responseData);

    if (!res.ok) {
      return { errors: responseData.message || ['회원가입 실패. 다시 시도해주세요.'] };
    }

    // ✅ 백엔드 응답 구조에 맞게 수정: { success: true, data: { user } }
    if (responseData.success && responseData.data) {
      const { user } = responseData.data;
      console.log('✅ 회원가입 성공:', user.email);
      return { success: true, user };
    }

    return { errors: ['회원가입 응답 데이터가 올바르지 않습니다.'] };
  } catch (error) {
    console.error('❌ 회원가입 요청 실패:', error);
    return { errors: ['네트워크 오류가 발생했습니다. 다시 시도해주세요.'] };
  }
}

// JWT 디코딩 함수 (토큰에서 사용자 정보 추출)
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

export async function loginUser(email: string, password: string) {
  const { login } = authStore;
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }), // ✅ provider 제거 - 백엔드 스키마와 맞춤
      credentials: 'include',
    });

    const responseData = await res.json();
    console.log('🚀 로그인 응답 데이터 --->', responseData);

    if (!res.ok) {
      return { error: responseData.message || '로그인 실패. 다시 시도해주세요.' };
    }

    // ✅ 백엔드 응답 구조에 맞게 수정: { success: true, data: { user, tokens } }
    if (responseData.success && responseData.data) {
      const { user, tokens } = responseData.data;
      if (tokens && tokens.accessToken) {
        // ✅ JWT 토큰에서 실제 사용자 정보 추출
        const decodedToken = decodeJWT(tokens.accessToken);
        console.log('🔍 디코딩된 토큰 정보:', decodedToken);
        
        if (!decodedToken) {
          return { error: '토큰을 디코딩할 수 없습니다.' };
        }
        
        // ✅ 토큰의 사용자 정보를 우선 사용하되, 응답 데이터로 보완
        const normalizedUser = {
          // 토큰에서 가져온 정보를 우선 사용 (sub 또는 userId)
          userId: decodedToken.userId || decodedToken.sub || user.id,
          id: decodedToken.userId || decodedToken.sub || user.id,
          email: decodedToken.email || user.email,
          role: decodedToken.role || user.role,
          // 응답 데이터에서 추가 정보 보완
          provider: user.provider || 'EMAIL',
          name: user.name || decodedToken.name,
          picture: user.picture || decodedToken.picture,
          created_at: user.created_at,
        };
        
        console.log('✅ 최종 정규화된 사용자 정보:', normalizedUser);
        console.log('✅ 토큰 userId:', decodedToken.userId);
        console.log('✅ 토큰 sub:', decodedToken.sub);
        console.log('✅ 응답 user.id:', user.id);
        
        login(normalizedUser, tokens.accessToken);
        console.log('✅ 로그인 성공:', normalizedUser.email, 'userId:', normalizedUser.userId);
        return { success: true, user: normalizedUser };
      }
    }

    return { error: '로그인 응답 데이터가 올바르지 않습니다.' };
  } catch (error) {
    console.error('❌ 로그인 요청 실패:', error);
    return { error: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' };
  }
}

// ✅ 로그아웃
export async function logoutUser() {
  const { logout } = authStore;

  await fetchWithAuth('/api/auth/logout', {
    method: 'POST',
    credentials: 'include', // ✅ HTTP Only 쿠키 자동 포함
  });

  logout();
  document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  window.location.href = '/signin';
}

// ✅ 리프레시 토큰을 사용하여 새 엑세스 토큰 받기
export async function refreshAccessToken() {
  const { login } = authStore;

  console.log('🔄 토큰 새로고침 중...');

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // ✅ HTTP Only 쿠키 자동 포함
    });

    if (!res.ok) {
      console.log('❌ 토큰 새로고침 실패.');
      return null;
    }

    const responseData = await res.json();
    console.log('🚀 토큰 새로고침 응답 --->', responseData);

    // ✅ 백엔드 응답 구조에 맞게 수정: { success: true, data: { accessToken, refreshToken } }
    if (responseData.success && responseData.data) {
      const tokens = responseData.data;
      if (tokens.accessToken) {
        // ✅ 새 토큰에서 사용자 정보 추출하여 업데이트
        const decodedToken = decodeJWT(tokens.accessToken);
        const currentUser = authStore.user;
        
        if (decodedToken && currentUser) {
          // 토큰 정보로 사용자 정보 업데이트
          const updatedUser = {
            ...currentUser,
            userId: decodedToken.userId || decodedToken.sub || currentUser.userId,
            id: decodedToken.userId || decodedToken.sub || currentUser.id,
            email: decodedToken.email || currentUser.email,
            role: decodedToken.role || currentUser.role,
          };
          
          login(updatedUser, tokens.accessToken);
          console.log('✅ 토큰 새로고침 성공');
          return { user: updatedUser, token: tokens.accessToken };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('❌ 토큰 새로고침 요청 실패:', error);
    return null;
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const authStore = useAuthStore.getState();
  const accessToken = authStore?.accessToken; // ✅ 상태가 없으면 undefined 반환

  console.log('🔍 현재 accessToken 상태:', accessToken ? '있음' : '없음');

  if (!accessToken) {
    console.log('❌ Access token not found. Please log in.');
    return null;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  });

  if (accessToken && res.status === 401) {
    console.warn('🔄 Access Token expired. Trying to refresh...');
    const result = await refreshAccessToken();
    const token = result?.token;
    if (token) {
      return fetchWithAuth(url, options);
    }
  }

  if (res && res.status >= 400) {
    console.log('HTTP Error:', res.status, res.statusText);
    return { error: true, status: res.status, message: res.statusText };
  }

  return res.json();
}

export async function fetchProfile() {
  const authStore = useAuthStore.getState();
  if (authStore.accessToken) {
    const res = await refreshAccessToken();
    return res;
  }
}

export const updateProfile = async (profileData: { [key: string]: unknown }) => {
  const res = await fetchWithAuth(`/api/auth/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ name: profileData.name }),
  });
  console.log('updateProfile', res.data);
  return res.data;
};
