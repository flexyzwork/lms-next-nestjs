/**
 * 🔐 인증 관련 유틸리티 함수들
 * 중복되는 인증 로직을 모아둔 유틸리티 모듈입니다.
 */

import { BadRequestException } from '@nestjs/common';

/**
 * 클라이언트 IP 주소 추출
 * 프록시, 로드밸런서, CDN 환경을 고려한 안전한 IP 추출
 * 
 * @param req Express Request 객체
 * @returns 클라이언트의 실제 IP 주소
 */
export function extractClientIp(req: any): string {
  // 다양한 프록시 헤더들을 순서대로 확인
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare
  const xClientIp = req.headers['x-client-ip'];
  const xForwardedFor = req.headers['x-forwarded-for'];

  // x-forwarded-for는 여러 IP가 쉼표로 구분될 수 있음 (첫 번째가 실제 클라이언트)
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // 다른 헤더들 확인
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (xClientIp) return xClientIp;

  // 직접 연결된 경우
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         '알 수 없음';
}

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 * 
 * @param req Express Request 객체
 * @returns JWT 토큰 문자열
 * @throws UnauthorizedException Bearer 토큰이 없는 경우
 */
export function extractBearerToken(req: any): string {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new BadRequestException('Authorization 헤더가 필요합니다');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new BadRequestException('Bearer 토큰 형식이 올바르지 않습니다');
  }

  const token = authHeader.substring(7); // 'Bearer ' 제거
  
  if (!token || token.trim() === '') {
    throw new BadRequestException('토큰이 비어있습니다');
  }

  return token.trim();
}

/**
 * 사용자 에이전트 정보 파싱
 * 
 * @param userAgent User-Agent 헤더 값
 * @returns 파싱된 브라우저/기기 정보
 */
export function parseUserAgent(userAgent?: string) {
  if (!userAgent) {
    return {
      browser: '알 수 없음',
      os: '알 수 없음',
      device: '알 수 없음',
      raw: '알 수 없음'
    };
  }

  // 간단한 브라우저 감지
  let browser = '알 수 없음';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // 간단한 OS 감지
  let os = '알 수 없음';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  // 간단한 기기 감지
  let device = 'Desktop';
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet')) device = 'Tablet';

  return {
    browser,
    os,
    device,
    raw: userAgent
  };
}

/**
 * 보안 이벤트 로깅용 데이터 준비
 * 민감한 정보는 제외하고 필요한 정보만 추출
 * 
 * @param req Express Request 객체
 * @param additionalData 추가 로깅 데이터
 * @returns 로깅용 보안 데이터
 */
export function prepareSecurityLogData(req: any, additionalData: any = {}) {
  const ip = extractClientIp(req);
  const userAgent = parseUserAgent(req.get('User-Agent'));
  
  return {
    timestamp: new Date().toISOString(),
    requestId: req.requestId || 'unknown',
    ip,
    userAgent: userAgent.raw,
    browser: userAgent.browser,
    os: userAgent.os,
    device: userAgent.device,
    method: req.method,
    url: req.url,
    referer: req.get('Referer') || null,
    ...additionalData
  };
}

/**
 * 시간 문자열을 초 단위로 변환
 * JWT 만료 시간 등에 사용
 * 
 * @param timeString 시간 문자열 (예: '7d', '24h', '60m', '30s')
 * @returns 초 단위 시간
 * @throws BadRequestException 잘못된 형식
 */
export function parseTimeString(timeString: string): number {
  const regex = /^(\d+)([dhms])$/;
  const match = timeString.match(regex);

  if (!match) {
    throw new BadRequestException(`잘못된 시간 형식입니다: ${timeString}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60; // 일
    case 'h': return value * 60 * 60;      // 시간  
    case 'm': return value * 60;           // 분
    case 's': return value;                // 초
    default:
      throw new BadRequestException(`지원하지 않는 시간 단위입니다: ${unit}`);
  }
}

/**
 * 비밀번호 강도 검사
 * 
 * @param password 검사할 비밀번호
 * @returns 강도 점수 및 상세 정보
 */
export function checkPasswordStrength(password: string) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[@$!%*?&]/.test(password),
    noCommonPatterns: !/(123|abc|password|admin)/i.test(password),
  };

  // 각 조건당 1점
  Object.values(checks).forEach(check => {
    if (check) score += 1;
  });

  // 추가 점수 (길이에 따라)
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  const strength = score <= 3 ? 'weak' : score <= 5 ? 'medium' : 'strong';

  return {
    score,
    maxScore: 8,
    strength,
    checks,
    suggestions: [
      !checks.length && '최소 8자 이상 입력하세요',
      !checks.lowercase && '소문자를 포함하세요',
      !checks.uppercase && '대문자를 포함하세요',
      !checks.numbers && '숫자를 포함하세요',
      !checks.symbols && '특수문자(@$!%*?&)를 포함하세요',
      !checks.noCommonPatterns && '흔한 패턴(123, abc, password 등)을 피하세요',
      password.length < 12 && '12자 이상 사용하면 더 안전합니다',
    ].filter(Boolean),
  };
}

/**
 * 이메일 마스킹
 * 개인정보 보호를 위해 이메일 일부를 마스킹
 * 
 * @param email 마스킹할 이메일
 * @returns 마스킹된 이메일
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***@***.***';
  }

  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.length <= 2 
    ? localPart 
    : localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length >= 2
    ? '*'.repeat(domainParts[0].length) + '.' + domainParts.slice(1).join('.')
    : '*'.repeat(domain.length);

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * 전화번호 마스킹
 * 
 * @param phone 마스킹할 전화번호
 * @returns 마스킹된 전화번호
 */
export function maskPhone(phone: string): string {
  if (!phone) return '***-****-****';
  
  // 숫자만 추출
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length === 11 && numbers.startsWith('01')) {
    // 한국 휴대폰 번호: 010-1234-5678 -> 010-****-5678
    return `${numbers.slice(0, 3)}-****-${numbers.slice(-4)}`;
  }
  
  // 기타 번호는 끝 4자리만 표시
  return '*'.repeat(Math.max(0, numbers.length - 4)) + numbers.slice(-4);
}

/**
 * 안전한 사용자 데이터 반환
 * 민감한 정보를 제거한 사용자 객체 생성
 * 
 * @param user 원본 사용자 객체
 * @returns 안전한 사용자 객체
 */
export function sanitizeUser(user: any) {
  if (!user) return null;

  const {
    password,
    refreshTokens,
    resetToken,
    verificationToken,
    ...safeUser
  } = user;

  return {
    ...safeUser,
    email: user.email, // 이메일은 마스킹하지 않음 (필요시 별도 처리)
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
    lastLoginAt: user.lastLoginAt?.toISOString?.() || user.lastLoginAt,
  };
}

/**
 * 요청 크기 제한 검사
 * 
 * @param req Express Request 객체
 * @param maxSizeBytes 최대 허용 크기 (바이트)
 * @throws BadRequestException 크기 초과시
 */
export function validateRequestSize(req: any, maxSizeBytes: number = 1024 * 1024) { // 기본 1MB
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  
  if (contentLength > maxSizeBytes) {
    throw new BadRequestException(
      `요청 크기가 너무 큽니다. 최대 ${Math.round(maxSizeBytes / 1024)}KB까지 허용됩니다.`
    );
  }
}

/**
 * 레이트 리미팅용 키 생성
 * 
 * @param identifier 식별자 (이메일, IP 등)
 * @param action 액션 타입
 * @returns Redis 키
 */
export function createRateLimitKey(identifier: string, action: string): string {
  return `rate_limit:${action}:${identifier}`;
}

/**
 * 디바이스 지문 생성
 * 기본적인 디바이스 식별을 위한 해시 생성
 * 
 * @param req Express Request 객체
 * @returns 디바이스 지문 문자열
 */
export function generateDeviceFingerprint(req: any): string {
  const ip = extractClientIp(req);
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  // 간단한 해시 생성 (실제 프로덕션에서는 crypto 모듈 사용 권장)
  const fingerprint = Buffer.from(`${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}`)
    .toString('base64')
    .slice(0, 16);
    
  return fingerprint;
}
