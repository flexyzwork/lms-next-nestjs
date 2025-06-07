import { useEffect } from 'react';

import { refreshAccessToken } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

export const useAuthRefresh = () => {
  const { setToken } = useAuthStore();

  useEffect(() => {
    const refreshToken = async () => {
      const result = await refreshAccessToken();
      if (result?.token) {
        setToken(result.token);
      }
    };

    // 주기적으로 리프레시 토큰 요청
    const interval = setInterval(refreshToken, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};
