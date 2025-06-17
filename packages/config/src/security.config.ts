import { registerAs } from '@nestjs/config';

/**
 * 🔐 보안 관련 설정
 * 브루트 포스 공격 방지, 세션 관리 등의 보안 정책을 정의합니다.
 */
export default registerAs('security', () => ({
  // 🛡️ 브루트 포스 공격 방지 설정
  bruteForce: {
    // 최대 로그인 시도 횟수
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    
    // 계정 잠금 시간 (분)
    lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
    
    // IP별 최대 시도 횟수
    maxIpAttempts: parseInt(process.env.MAX_IP_ATTEMPTS || '10', 10),
  },

  // ⏱️ 세션 관리 설정
  session: {
    // 세션 만료 시간 검사 간격 (분)
    cleanupIntervalMinutes: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '60', 10),
    
    // 비활성 세션 만료 시간 (시간)
    inactiveTimeoutHours: parseInt(process.env.INACTIVE_TIMEOUT_HOURS || '24', 10),
  },

  // 🔑 토큰 관리 설정
  token: {
    // 토큰 블랙리스트 정리 간격 (분)
    blacklistCleanupMinutes: parseInt(process.env.TOKEN_BLACKLIST_CLEANUP || '30', 10),
    
    // 리프레시 토큰 로테이션 활성화
    enableRefreshRotation: process.env.ENABLE_REFRESH_ROTATION === 'true',
  },

  // 🌐 CORS 설정
  cors: {
    // 허용된 오리진 목록
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
    ],
    
    // 자격증명 포함 허용
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // 📝 로깅 설정
  logging: {
    // 민감한 정보 로깅 여부 (개발환경에서만)
    logSensitiveData: process.env.NODE_ENV === 'development' && 
                     process.env.LOG_SENSITIVE_DATA === 'true',
    
    // 로그인 시도 로깅 활성화
    logAuthAttempts: process.env.LOG_AUTH_ATTEMPTS !== 'false',
  },

  // 🔒 암호화 설정
  encryption: {
    // 비밀번호 해시 라운드 수
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    
    // 데이터 암호화 키 로테이션 (일)
    keyRotationDays: parseInt(process.env.KEY_ROTATION_DAYS || '30', 10),
  },

  // 🚨 보안 이벤트 알림
  alerts: {
    // 이메일 알림 활성화
    emailAlerts: process.env.SECURITY_EMAIL_ALERTS === 'true',
    
    // Slack 웹훅 URL
    slackWebhook: process.env.SECURITY_SLACK_WEBHOOK,
    
    // 의심스러운 활동 임계값
    suspiciousActivityThreshold: parseInt(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD || '10', 10),
  },
}));