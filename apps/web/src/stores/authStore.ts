import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: {
    userId: string;
    id: string;
    provider: string;
    name: string;
    email: string;
    role: 'USER' | 'INSTRUCTOR';
    picture: string;
    created_at: string;
  } | null;
  accessToken: string | null;
  login: (user: AuthState['user'], token: string) => void;
  logout: () => void;
  setUser: (user: AuthState['user']) => void; 
  setToken: (token: AuthState['accessToken']) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      login: (user, token) => {
        if (!user || !token) {
          console.error('❌ 로그인 실패: 사용자 정보 또는 토큰이 없음');
          return;
        }

        // userId 필드 정규화 및 검증
        const normalizedUser = {
          ...user,
          userId: user.userId || user.id, // userId가 없으면 id를 사용
          id: user.id || user.userId, // id가 없으면 userId를 사용
        };
        
        // 필수 필드 검증
        if (!normalizedUser.userId) {
          console.error('❌ 로그인 실패: userId 필드가 없음', normalizedUser);
          return;
        }
        
        console.log('✅ 로그인 성공 - 저장 전 사용자 데이터:', user);
        console.log('✅ 로그인 성공 - 정규화된 사용자 데이터:', normalizedUser);
        console.log('✅ 로그인 성공 - 토큰:', token ? '토큰 있음' : '토큰 없음');
        
        set({ user: normalizedUser, accessToken: token });
      },
      logout: () => {
        console.log('🔴 로그아웃 - 상태 초기화');
        set({ user: null, accessToken: null });
      },
      setUser: (user) => {
        if (!user) {
          set({ user: null });
          return;
        }

        // setUser에서도 userId 정규화
        const normalizedUser = {
          ...user,
          userId: user.userId || user.id,
          id: user.id || user.userId,
        };
        
        if (!normalizedUser.userId) {
          console.error('❌ 사용자 정보 업데이트 실패: userId 필드가 없음', normalizedUser);
          return;
        }
        
        console.log('📝 사용자 정보 업데이트:', normalizedUser);
        set({ user: normalizedUser });
      },
      setToken: (token) => {
        console.log('🔑 토큰 업데이트:', token ? '토큰 있음' : '토큰 없음');
        set({ accessToken: token });
      },
    }),
    {
      name: 'auth-storage',
      // 상태 복원 시에도 userId 정규화 및 검증 적용
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          const originalUser = state.user;
          
          // userId 정규화
          if (!state.user.userId && state.user.id) {
            state.user.userId = state.user.id;
            console.log('🔄 스토리지 복원 시 userId 정규화:', state.user);
          }
          
          // id 정규화
          if (!state.user.id && state.user.userId) {
            state.user.id = state.user.userId;
            console.log('🔄 스토리지 복원 시 id 정규화:', state.user);
          }
          
          // 필수 필드 검증
          if (!state.user.userId) {
            console.error('❌ 스토리지 복원 실패: userId 필드가 없음', originalUser);
            state.user = null;
            state.accessToken = null;
          } else {
            console.log('✅ 스토리지에서 인증 상태 복원 성공:', {
              userId: state.user.userId,
              email: state.user.email
            });
          }
        }
      },
    }
  )
);
