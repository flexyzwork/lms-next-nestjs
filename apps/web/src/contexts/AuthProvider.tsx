/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { fetchProfile } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import type { AuthUser } from '@packages/schemas';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, login } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const profile = await fetchProfile();
      if (profile?.user && profile?.token) {
        // 이미 새로운 타입을 사용하므로 그대로 전달
        login(profile.user, { accessToken: profile.token, refreshToken: '', tokenType: 'Bearer', expiresIn: 3600 });
      }
      setLoading(false);
    }
    checkUser();
  }, [login]);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
