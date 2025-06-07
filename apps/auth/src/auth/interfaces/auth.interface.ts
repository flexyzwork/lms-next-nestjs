export interface JwtPayload {
  sub: string; // 사용자 ID (표준 JWT 필드)
  userId: string; // 호환성을 위한 추가 필드
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string; // 사용자 ID
  tokenId: string; // 토큰 고유 ID
  iat?: number;
  exp?: number;
}

export interface SocialUser {
  provider: string;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  tokens: TokenPair;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}
