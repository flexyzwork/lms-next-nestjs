'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { TokenManager, AuthApiClient, type AuthUser } from '@packages/auth';

// API Gateway URL 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
const authApi = new AuthApiClient(API_BASE_URL);

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // 초기 로드 시 토큰 확인
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 주기적으로 토큰 갱신
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        refreshToken();
      }, 5 * 60 * 1000); // 5분마다 토큰 갱신 시도

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const accessToken = TokenManager.getAccessToken();

      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      // 토큰이 만료되었는지 확인
      if (TokenManager.isTokenExpired(accessToken)) {
        await refreshToken();
        return;
      }

      // 프로필 정보 가져오기
      const response = await authApi.getProfile(accessToken);
      if (response.success && response.data) {
        // 응답 데이터 정규화
        const userData = response.data.user || response.data;
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      TokenManager.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });

      if (response.success && response.data) {
        if (response.data.tokens) {
          TokenManager.setTokens(
            response.data.tokens.accessToken,
            response.data.tokens.refreshToken
          );
        }
        if (response.data.user) {
          setUser(response.data.user);
        }
      } else {
        throw new Error(response.message || '로그인에 실패했습니다');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const accessToken = TokenManager.getAccessToken();
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      TokenManager.clearTokens();
      setUser(null);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = TokenManager.getRefreshToken();

      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await authApi.refreshToken(refreshTokenValue);

      if (response.success && response.data) {
        TokenManager.setTokens(
          response.data.accessToken,
          response.data.refreshToken
        );

        // 새 토큰으로 프로필 정보 갱신
        const profileResponse = await authApi.getProfile(response.data.accessToken);
        if (profileResponse.success && profileResponse.data) {
          setUser(profileResponse.data);
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      TokenManager.clearTokens();
      setUser(null);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
