/**
 * 📄 사용자 인터페이스 정의
 * 
 * 시스템 전반에서 사용되는 표준 사용자 객체 구조
 * CUID2 ID 시스템을 사용하며 임시 ID는 완전히 제거됨
 */

/** 사용자 역할 타입 */
export type UserRole = 
  | 'user' | 'USER' | 'student' | 'STUDENT'          // 학생
  | 'teacher' | 'TEACHER' | 'instructor' | 'INSTRUCTOR'  // 강사
  | 'admin' | 'ADMIN';                               // 관리자

export interface User {
  /** 🆔 사용자 고유 ID (CUID2, 24자) */
  id: string;
  
  /** 📧 이메일 주소 (고유값) */
  email: string;
  
  /** 👤 사용자명 (고유값) */
  username: string;
  
  /** 👨 이름 */
  firstName?: string;
  
  /** 👨 성 */
  lastName?: string;
  
  /** 🖼️ 프로필 이미지 URL */
  avatar?: string;
  
  /** 🔑 사용자 역할 */
  role?: UserRole;
  
  /** ✅ 이메일 인증 상태 */
  isVerified?: boolean;
  
  /** 🟢 계정 활성화 상태 */
  isActive?: boolean;
  
  /** 🕐 마지막 로그인 시간 */
  lastLoginAt?: Date;
  
  /** 📅 생성일 */
  createdAt?: Date;
  
  /** 📅 수정일 */
  updatedAt?: Date;
}

/**
 * 🔑 JWT 액세스 토큰 페이로드
 * 
 * 표준 JWT 클레임과 커스텀 필드 포함
 * 보안을 위해 최소한의 정보만 포함
 */
export interface JwtPayload {
  /** 🆔 사용자 ID (표준 JWT 'sub' 클레임) */
  sub: string;
  
  /** 📧 이메일 주소 */
  email: string;
  
  /** 👤 사용자명 */
  username: string;
  
  /** 🔑 사용자 역할 */
  role?: UserRole;
  
  /** 🕐 토큰 발행 시간 (Unix timestamp) */
  iat?: number;
  
  /** ⏰ 토큰 만료 시간 (Unix timestamp) */
  exp?: number;
  
  /** 🏢 토큰 발급자 */
  iss?: string;
  
  /** 👥 토큰 대상 */
  aud?: string;
}

/**
 * 🔄 JWT 리프레시 토큰 페이로드
 * 
 * 리프레시 토큰은 최소한의 정보만 포함하여 보안 강화
 */
export interface JwtRefreshPayload {
  /** 🆔 사용자 ID */
  sub: string;
  
  /** 🎲 토큰 고유 ID (세션 추적용) */
  tokenId: string;
  
  /** 🕐 토큰 발행 시간 */
  iat?: number;
  
  /** ⏰ 토큰 만료 시간 */
  exp?: number;
}

/**
 * 🌐 인증된 요청 객체
 * 
 * Express Request에 사용자 정보가 추가된 확장 인터페이스
 */
export interface AuthenticatedRequest extends Request {
  /** 👤 인증된 사용자 정보 */
  user: User;
  
  /** 🔑 원본 JWT 토큰 (옵션) */
  token?: string;
  
  /** 📍 클라이언트 IP 주소 */
  clientIp?: string;
  
  /** 🌐 사용자 에이전트 */
  userAgent?: string;
}

/**
 * 🔐 토큰 쌍 인터페이스
 * 
 * 로그인 및 토큰 갱신 시 반환되는 토큰 구조
 */
export interface TokenPair {
  /** 🔑 액세스 토큰 (짧은 만료 시간) */
  accessToken: string;
  
  /** 🔄 리프레시 토큰 (긴 만료 시간) */
  refreshToken: string;
  
  /** ⏰ 액세스 토큰 만료 시간 (초) */
  expiresIn?: number;
  
  /** 🏷️ 토큰 타입 (항상 'Bearer') */
  tokenType?: 'Bearer';
}

/**
 * 👤 JWT Strategy에서 사용하는 사용자 정보
 * 
 * Passport JWT Strategy 검증 후 request.user에 설정되는 객체
 */
export interface JwtUser {
  /** 🆔 사용자 ID */
  id: string;
  
  /** 📧 이메일 주소 */
  email: string;
  
  /** 👤 사용자명 */
  username: string;
  
  /** 🔑 사용자 역할 */
  role?: UserRole;
  
  /** ✅ 이메일 인증 상태 */
  isVerified?: boolean;
  
  /** 🟢 계정 활성화 상태 */
  isActive?: boolean;
}

/**
 * 역할 확인 헬퍼 함수들
 */
export const RoleUtils = {
  /** 강사 역할인지 확인 */
  isInstructor: (role?: UserRole): boolean => {
    return ['teacher', 'TEACHER', 'instructor', 'INSTRUCTOR'].includes(role || '');
  },
  
  /** 관리자 역할인지 확인 */
  isAdmin: (role?: UserRole): boolean => {
    return ['admin', 'ADMIN'].includes(role || '');
  },
  
  /** 학생 역할인지 확인 */
  isStudent: (role?: UserRole): boolean => {
    return ['user', 'USER', 'student', 'STUDENT'].includes(role || '');
  },
  
  /** 강사 또는 관리자인지 확인 */
  canManageCourses: (role?: UserRole): boolean => {
    return RoleUtils.isInstructor(role) || RoleUtils.isAdmin(role);
  }
};
