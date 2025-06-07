export interface User {
  id: string;
  userId: string; // JWT에서 사용하는 필드와 호환
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: string;
  isVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JwtPayload {
  sub: string; // 사용자 ID (표준 JWT 필드)
  userId: string; // 호환성을 위한 추가 필드
  email: string;
  username: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: User;
}
