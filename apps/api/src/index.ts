import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
/* ROUTE IMPORTS */
let authRoutes,
  courseRoutes,
  transactionRoutes,
  userCourseProgressRoutes,
  verifyToken;

try {
  authRoutes = require('./routes/auth');
  if (typeof authRoutes === 'object' && authRoutes.default) {
    authRoutes = authRoutes.default;
  }

  courseRoutes = require('./routes/courseRoutes');
  if (typeof courseRoutes === 'object' && courseRoutes.default) {
    courseRoutes = courseRoutes.default;
  }

  transactionRoutes = require('./routes/transactionRoutes');
  if (typeof transactionRoutes === 'object' && transactionRoutes.default) {
    transactionRoutes = transactionRoutes.default;
  }

  userCourseProgressRoutes = require('./routes/userCourseProgressRoutes');
  if (
    typeof userCourseProgressRoutes === 'object' &&
    userCourseProgressRoutes.default
  ) {
    userCourseProgressRoutes = userCourseProgressRoutes.default;
  }

  const authMiddleware = require('./middleware/authMiddleware');
  verifyToken =
    authMiddleware.verifyToken || authMiddleware.default?.verifyToken;

  console.log('✅ Routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error);
  process.exit(1);
}

/* CONFIGURATIONS */
dotenv.config();

// 🔥 KST 시간 적용한 date 토큰 재정의
morgan.token('date', () => {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
});

const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('common'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  })
);

/* ROUTES */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// 🔧 모든 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`📝 요청 수신: ${req.method} ${req.url}`);
  console.log(`📝 헤더:`, {
    authorization: req.headers.authorization ? '토큰 있음' : '토큰 없음',
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...',
    origin: req.headers.origin,
  });

  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    console.log(`🔑 토큰 미리보기: ${token?.substring(0, 30)}...`);
  }

  next();
});

// 라우트 검증
if (typeof authRoutes !== 'function') {
  console.error('❌ authRoutes is not a function:', typeof authRoutes);
  console.log('authRoutes:', authRoutes);
}

if (typeof courseRoutes !== 'function') {
  console.error('❌ courseRoutes is not a function:', typeof courseRoutes);
}

if (typeof verifyToken !== 'function') {
  console.error('❌ verifyToken is not a function:', typeof verifyToken);
}

app.use('/api/v1/auth', authRoutes);
app.use('/courses', courseRoutes);
app.use('/transactions', verifyToken, transactionRoutes);
app.use('/users/course-progress', verifyToken, userCourseProgressRoutes);

// 🔧 디버깅용 JWT 검증 엔드포인트
app.get('/debug/jwt-verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const jwt = require('jsonwebtoken');
  const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    res.json({
      success: true,
      message: 'JWT 검증 성공',
      payload: decoded,
      secret_preview: JWT_ACCESS_SECRET
        ? JWT_ACCESS_SECRET.substring(0, 8) + '...'
        : 'NONE',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(403).json({
      success: false,
      message: 'JWT 검증 실패',
      error: errorMessage,
      secret_preview: JWT_ACCESS_SECRET
        ? JWT_ACCESS_SECRET.substring(0, 8) + '...'
        : 'NONE',
    });
  }
});

/* SERVER */
const port = process.env.API_PORT || 4001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
