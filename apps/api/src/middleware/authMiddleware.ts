import express from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

declare module 'express' {
  export interface Request {
    user?: User | JwtPayload | string;
  }
}

export interface User extends JwtPayload {
  userId: string;
  email: string | null;
  role: 'USER' | 'INSTRUCTOR';
  provider: 'EMAIL' | 'GOOGLE' | 'GITHUB';
  providerId: string | null;
  name: string | null;
  picture: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

dotenv.config();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || ''; // JWT 서명 키
if (!JWT_ACCESS_SECRET) {
  throw new Error('JWT_ACCESS_SECRET is not defined');
}

// 디버깅을 위한 로그 파일 저장
// function saveDebugLog(data: any) {
//   const logPath = path.join(process.cwd(), 'debug-jwt.log');
//   const timestamp = new Date().toISOString();
//   const logEntry = `[${timestamp}] ${JSON.stringify(data, null, 2)}\n\n`;

//   try {
//     fs.appendFileSync(logPath, logEntry);
//   } catch (error) {
//     console.error('로그 파일 저장 실패:', error);
//   }
// }

export const verifyToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    JWT_ACCESS_SECRET_present: !!JWT_ACCESS_SECRET,
    JWT_ACCESS_SECRET_preview: JWT_ACCESS_SECRET
      ? JWT_ACCESS_SECRET.substring(0, 8) + '...'
      : 'NONE',
  };

  console.log('🔍 JWT 검증 시작 - URL:', req.url);
  console.log(
    '🔍 JWT_ACCESS_SECRET 존재 여부:',
    JWT_ACCESS_SECRET ? '✅ 있음' : '❌ 없음'
  );
  console.log(
    '🔍 JWT_ACCESS_SECRET 값:',
    JWT_ACCESS_SECRET.substring(0, 8) + '...'
  );

  const authHeader = req.headers.authorization;
  debugInfo.authHeader_present = !!authHeader;
  debugInfo.authHeader_format = authHeader ? 'Bearer format' : 'NONE';

  console.log('🔍 Authorization 헤더:', authHeader ? '✅ 있음' : '❌ 없음');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    debugInfo.error = 'No Authorization header or wrong format';
    // saveDebugLog(debugInfo);

    console.log('❌ Authorization 헤더가 없거나 Bearer 형식이 아님');
    res.status(401).json({ message: 'Unauthorized - No Token Provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  debugInfo.token_length = token.length;
  debugInfo.token_preview = token.substring(0, 20) + '...';

  console.log('🔍 추출된 토큰 길이:', token.length);
  console.log('🔍 토큰 시작:', token.substring(0, 20) + '...');

  // 토큰을 파일에도 저장 (디버깅용)
  // try {
  //   const tokenPath = path.join(process.cwd(), 'debug-token.txt');
  //   fs.writeFileSync(
  //     tokenPath,
  //     `토큰 (${new Date().toISOString()}):\n${token}\n\n시크릿:\n${JWT_ACCESS_SECRET}\n`
  //   );
  // } catch (error) {
  //   console.error('토큰 파일 저장 실패:', error);
  // }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;

    debugInfo.verification_success = true;
    debugInfo.decoded_payload = {
      sub: decoded.sub,
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    // 🔧 수정: sub를 userId로 정규화
    const normalizedDecoded = {
      ...decoded,
      userId: decoded.userId || decoded.sub, // userId 우선, 없으면 sub 사용
    };

    debugInfo.normalized_userId = normalizedDecoded.userId;

    console.log('✅ JWT 검증 성공:', {
      sub: decoded.sub,
      userId: decoded.userId,
      normalizedUserId: normalizedDecoded.userId,
      email: decoded.email,
      exp: decoded.exp
        ? new Date(decoded.exp * 1000).toLocaleString('ko-KR')
        : '없음',
      iat: decoded.iat
        ? new Date(decoded.iat * 1000).toLocaleString('ko-KR')
        : '없음',
    });

    // 토큰 만료 확인
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      debugInfo.error = 'Token expired';
      // saveDebugLog(debugInfo);

      console.log('❌ 토큰이 만료됨');
      res.status(403).json({ message: 'Forbidden - Token Expired' });
      return;
    }

    // 필수 필드 검증
    if (!normalizedDecoded.userId) {
      debugInfo.error = 'No userId in token';
      // saveDebugLog(debugInfo);

      console.log('❌ 토큰에 userId(sub) 정보가 없음');
      res.status(403).json({ message: 'Forbidden - Invalid Token Payload' });
      return;
    }

    debugInfo.success = true;
    // saveDebugLog(debugInfo);

    req.user = normalizedDecoded;
    console.log(
      '✅ 인증 성공 - 다음 미들웨어로 진행, userId:',
      normalizedDecoded.userId
    );
    next();
  } catch (error: any) {
    debugInfo.verification_success = false;
    debugInfo.error = {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500), // 스택 트레이스 일부만
    };

    // saveDebugLog(debugInfo);

    console.error('❌ JWT 검증 실패:', {
      error: error.message,
      name: error.name,
      tokenLength: token.length,
    });

    if (error.name === 'TokenExpiredError') {
      res.status(403).json({ message: 'Forbidden - Token Expired' });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(403).json({ message: 'Forbidden - Invalid Token' });
    } else {
      res
        .status(403)
        .json({ message: 'Forbidden - Token Verification Failed' });
    }
    return;
  }
};
