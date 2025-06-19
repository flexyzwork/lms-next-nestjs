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
  clearStorage: () => void; // 디버깅용 스토리지 정리
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
        
        // 로컬 스토리지에서도 완전히 제거
        try {
          localStorage.removeItem('auth-storage');
        } catch (error) {
          console.warn('⚠️ 로컬 스토리지 제거 실패:', error);
        }
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
      
      // 긴급 스토리지 정리 (디버깅용)
      clearStorage: () => {
        console.warn('🧨 긴급 스토리지 정리 실행');
        set({ user: null, accessToken: null });
        try {
          localStorage.removeItem('auth-storage');
          localStorage.clear(); // 전체 로컬 스토리지 정리
          console.log('✅ 스토리지 정리 완료');
        } catch (error) {
          console.error('❌ 스토리지 정리 실패:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      
      // 스토리지 복원 시 검증 로직
      onRehydrateStorage: () => (state) => {
        try {
          if (state?.user) {
            // 빈 객체 또는 잘못된 데이터 처리
            const isEmptyObject = typeof state.user === 'object' && 
              Object.keys(state.user).length === 0;
            
            if (isEmptyObject) {
              console.warn('⚠️ 스토리지 복원: 빈 사용자 객체 발견, 초기화');
              state.user = null;
              state.accessToken = null;
              return;
            }
            
            // 기본적인 사용자 데이터 검증
            const hasRequiredFields = 
              state.user.id && 
              typeof state.user.id === 'string' &&
              state.user.email && 
              typeof state.user.email === 'string';
              
            if (!hasRequiredFields) {
              console.warn('⚠️ 스토리지 복원: 사용자 데이터 불완전, 초기화', {
                user: state.user,
                hasId: !!state.user.id,
                hasEmail: !!state.user.email
              });
              
              // 불완전한 데이터 초기화
              state.user = null;
              state.accessToken = null;
            } else {
              console.log('✅ 스토리지에서 인증 상태 복원 성공:', {
                userId: state.user.id,
                email: state.user.email,
                hasToken: !!state.accessToken
              });
            }
          } else {
            console.log('📭 스토리지: 저장된 사용자 정보 없음');
          }
        } catch (error) {
          console.error('❌ 스토리지 복원 중 오류:', error);
          // 오류 발생 시 안전하게 초기화
          if (state) {
            state.user = null;
            state.accessToken = null;
          }
        }
      },
    }
  )
);
