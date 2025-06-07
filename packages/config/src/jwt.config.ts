import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  // JWT 액세스 토큰 설정
  accessToken: {
    secret:
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_ACCESS_SECRET ||
      'jwt-access-secret',
    expiresIn:
      process.env.JWT_EXPIRESIN || process.env.JWT_ACCESS_EXPIRES_IN || '24h',
  },
  // JWT 리프레시 토큰 설정
  refreshToken: {
    secret:
      process.env.REFRESH_TOKEN_SECRET ||
      process.env.JWT_REFRESH_SECRET ||
      'jwt-refresh-secret',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
}));
