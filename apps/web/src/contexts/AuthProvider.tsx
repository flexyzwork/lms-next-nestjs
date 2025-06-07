/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { fetchProfile } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

interface AuthContextType {
  user: any;
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
        login(profile.user, profile.token);
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
