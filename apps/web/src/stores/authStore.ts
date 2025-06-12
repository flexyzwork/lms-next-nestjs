import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, AuthTokens } from '@packages/schemas';

// 상태 인터페이스 정리
interface AuthState {
  // 사용자 정보 (AuthUser 타입 사용)
  user: AuthUser | null;
  
  // 토큰 정보
  accessToken: string | null;
  
  // 액션들
  login: (user: AuthUser, tokens: AuthTokens) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      
      // 로그인 액션 - 사용자 정보와 토큰을 저장
      login: (user, tokens) => {
        if (!user || !tokens?.accessToken) {
          console.error('❌ 로그인 실패: 사용자 정보 또는 토큰이 없음');
          return;
        }
        
        console.log('✅ 로그인 성공:', {
          userId: user.id,
          email: user.email,
          hasToken: !!tokens.accessToken
        });
        
        set({ 
          user, 
          accessToken: tokens.accessToken 
        });
      },
      
      // 로그아웃 액션 - 모든 상태 초기화
      logout: () => {
        console.log('🔴 로그아웃 - 상태 초기화');
        set({ user: null, accessToken: null });
      },
      
      // 사용자 정보 업데이트
      setUser: (user) => {
        console.log('📝 사용자 정보 업데이트:', user?.email || 'null');
        set({ user });
      },
      
      // 토큰 업데이트
      setToken: (token) => {
        console.log('🔑 토큰 업데이트:', token ? '토큰 있음' : '토큰 없음');
        set({ accessToken: token });
      },
    }),
    {
      name: 'auth-storage',
      
      // 스토리지 복원 시 검증 로직
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          // 기본적인 사용자 데이터 검증
          if (!state.user.id || !state.user.email) {
            console.error('❌ 스토리지 복원 실패: 필수 필드 누락', {
              id: state.user.id,
              email: state.user.email
            });
            state.user = null;
            state.accessToken = null;
          } else {
            console.log('✅ 스토리지에서 인증 상태 복원 성공:', {
              userId: state.user.id,
              email: state.user.email
            });
          }
        }
      },
    }
  )
);
