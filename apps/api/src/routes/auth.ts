const express = require('express');
const { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema,
  AuthApiClient
} = require('@packages/auth');

const router = express.Router();

// Validation middleware
function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터 검증에 실패했습니다',
        errors: error.errors?.map((err) => ({
          field: err.path.join('.') || 'root',
          message: err.message,
          code: err.code,
        })) || []
      });
    }
  };
}

// Auth service base URL (auth 앱의 주소)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4000';

// Debug logging
console.log('AUTH_SERVICE_URL:', AUTH_SERVICE_URL);

// Auth API client 설정
const authApiClient = new AuthApiClient(AUTH_SERVICE_URL);

/**
 * 회원가입
 */
router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const registerData = req.body;
    const result = await authApiClient.register(registerData);
    
    // 응답 형식 확인 및 정규화
    if (result && result.success) {
      res.status(201).json(result);
    } else {
      // 예상치 못한 응답 형식 처리
      res.status(201).json({
        success: true,
        message: result.message || '회원가입이 완료되었습니다',
        data: result.data || result
      });
    }
  } catch (error) {
    console.error('회원가입 실패:', {
      message: error.message,
      stack: error.stack,
      authServiceUrl: AUTH_SERVICE_URL
    });
    
    // Auth 서비스 연결 오류 처리
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
      return res.status(503).json({
        success: false,
        message: 'Auth 서비스에 연결할 수 없습니다. 서비스가 실행 중인지 확인해주세요.',
        details: `Auth Service URL: ${AUTH_SERVICE_URL}`
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || '회원가입에 실패했습니다'
    });
  }
});

/**
 * 로그인
 */
router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const loginData = req.body;
    console.log('API Gateway - Login attempt for:', loginData.email);
    
    const result = await authApiClient.login(loginData);
    console.log('API Gateway - Login success:', result);
    
    res.json(result);
  } catch (error) {
    console.error('API Gateway - Login failed:', {
      message: error.message,
      status: error.status,
      response: error.response,
      stack: error.stack
    });
    
    // Auth 서비스에서 온 에러 메시지를 그대로 전달
    res.status(401).json({
      success: false,
      message: error.message || '로그인에 실패했습니다'
    });
  }
});

/**
 * 토큰 새로고침
 */
router.post('/refresh', validateBody(refreshTokenSchema), async (req: express.Request, res: express.Response) => {
  try {
    const { refreshToken }: RefreshTokenDto = req.body;
    const result = await authApiClient.refreshToken(refreshToken);
    
    res.json(result);
  } catch (error: any) {
    console.error('토큰 새로고침 실패:', error.message);
    res.status(401).json({
      success: false,
      message: error.message || '토큰 새로고침에 실패했습니다'
    });
  }
});

/**
 * 로그아웃
 */
router.post('/logout', async (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Bearer 토큰이 필요합니다'
      });
    }

    const accessToken = authHeader.substring(7);
    const result = await authApiClient.logout(accessToken);
    
    res.json(result);
  } catch (error: any) {
    console.error('로그아웃 실패:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || '로그아웃에 실패했습니다'
    });
  }
});

/**
 * 프로필 조회
 */
router.get('/profile', async (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Bearer 토큰이 필요합니다'
      });
    }

    const accessToken = authHeader.substring(7);
    const result = await authApiClient.getProfile(accessToken);
    
    res.json(result);
  } catch (error: any) {
    console.error('프로필 조회 실패:', error.message);
    res.status(401).json({
      success: false,
      message: error.message || '프로필 조회에 실패했습니다'
    });
  }
});

/**
 * 비밀번호 강도 검사
 */
router.post('/check-password-strength', async (req: express.Request, res: express.Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        message: '비밀번호를 입력해주세요'
      });
    }

    const result = await authApiClient.checkPasswordStrength(password);
    
    res.json(result);
  } catch (error: any) {
    console.error('비밀번호 강도 검사 실패:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || '비밀번호 강도 검사에 실패했습니다'
    });
  }
});

module.exports = router;
module.exports.default = router;
