import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import express from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  extractClientIp,
  extractBearerToken,
  prepareSecurityLogData,
  Public,
  CurrentUser,
  ZodBody,
  ZodValidationPipe,
} from '@packages/common';

// Zod 스키마 import from unified schemas package
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordStrengthSchema,
  updateProfileSchema,
  type RegisterDto,
  type LoginDto,
  type RefreshTokenDto,
  type UpdateProfileDto,
} from '@packages/schemas';

// 스웨거 응답 DTO 클래스들
class SuccessResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: any;
}

class AuthTokensDto {
  @ApiProperty({ description: '액세스 토큰' })
  accessToken: string;

  @ApiProperty({ description: '리프레시 토큰' })
  refreshToken: string;

  @ApiProperty({ description: '토큰 만료 시간' })
  expiresIn: number;
}

class UserDto {
  @ApiProperty({ description: '사용자 ID' })
  id: string;

  @ApiProperty({ description: '이메일' })
  email: string;

  @ApiProperty({ description: '사용자명' })
  username: string;

  @ApiProperty({ description: '이름' })
  name: string;

  @ApiProperty({ description: '역할', enum: ['USER', 'ADMIN', 'INSTRUCTOR'] })
  role: string;
}

class LoginResponseDto extends SuccessResponseDto {
  @ApiProperty({
    type: 'object',
    description: '로그인 성공 데이터',
    properties: {
      user: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'm3n4o5p6q7r8s9t0u1v2w3x4' },
          email: { type: 'string', example: 'student1@example.com' },
          username: { type: 'string', example: 'student_park' },
          name: { type: 'string', example: '박학생' },
          role: { type: 'string', example: 'USER' }
        }
      },
      tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          expiresIn: { type: 'number', example: 900 }
        }
      }
    }
  })
  data: {
    user: UserDto;
    tokens: AuthTokensDto;
  };
}

class RegisterResponseDto extends SuccessResponseDto {
  @ApiProperty({
    type: 'object',
    description: '회원가입 성공 데이터',
    properties: {
      user: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'a1b2c3d4e5f6g7h8i9j0k1l2' },
          email: { type: 'string', example: 'newuser@example.com' },
          username: { type: 'string', example: 'newuser' },
          name: { type: 'string', example: '홍길동' },
          role: { type: 'string', example: 'USER' }
        }
      }
    }
  })
  data: {
    user: UserDto;
  };
}

class ErrorResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  error: string;

  @ApiProperty()
  message: string | object;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  path: string;

  @ApiProperty()
  method: string;
}

// 요청 DTO 클래스들
class LoginRequestDto {
  @ApiProperty({ example: 'student1@example.com', description: '사용자 이메일' })
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  password: string;
}

class RegisterRequestDto {
  @ApiProperty({ example: 'newuser@example.com', description: '사용자 이메일' })
  email: string;

  @ApiProperty({ example: 'Password123!', description: '비밀번호 (8자 이상, 대소문자, 숫자, 특수문자 포함)' })
  password: string;

  @ApiProperty({ example: 'newuser', description: '사용자명 (선택사항)' })
  username?: string;

  @ApiProperty({ example: '홍', description: '이름 (선택사항)' })
  firstName?: string;

  @ApiProperty({ example: '길동', description: '성 (선택사항)' })
  lastName?: string;
}

class RefreshTokenRequestDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: '리프레시 토큰' })
  refreshToken: string;
}

class PasswordStrengthRequestDto {
  @ApiProperty({ example: 'MyStrongPassword123!', description: '강도를 검사할 비밀번호' })
  password: string;
}

class UpdateProfileRequestDto {
  @ApiProperty({ example: 'newusername', description: '사용자명 (선택사항)', required: false })
  username?: string;

  @ApiProperty({ example: '김', description: '이름 (선택사항)', required: false })
  firstName?: string;

  @ApiProperty({ example: '철수', description: '성 (선택사항)', required: false })
  lastName?: string;

  @ApiProperty({ example: '안녕하세요, 저는 개발자입니다.', description: '자기소개 (선택사항)', required: false })
  bio?: string;

  @ApiProperty({ example: '서울, 대한민국', description: '위치 (선택사항)', required: false })
  location?: string;

  @ApiProperty({ example: 'https://example.com', description: '웹사이트 (선택사항)', required: false })
  website?: string;

  @ApiProperty({ example: '1990-01-01', description: '생년월일 (YYYY-MM-DD) (선택사항)', required: false })
  dateOfBirth?: string;

  @ApiProperty({ example: '010-1234-5678', description: '전화번호 (선택사항)', required: false })
  phone?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', description: '아바타 URL (선택사항)', required: false })
  avatar?: string;
}

@ApiTags('🔐 인증 (Authentication)')
@ApiExtraModels(
  LoginRequestDto,
  RegisterRequestDto,
  RefreshTokenRequestDto,
  PasswordStrengthRequestDto,
  UpdateProfileRequestDto,
  ErrorResponseDto,
)
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ZodBody(registerSchema)
  @ApiOperation({ 
    summary: '사용자 회원가입',
    description: '새로운 사용자 계정을 생성합니다.' 
  })
  @ApiBody({ 
    type: RegisterRequestDto,
    description: '회원가입 정보'
  })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '이미 존재하는 이메일 또는 사용자명',
    type: ErrorResponseDto,
  })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        success: true,
        message: result.message,
        data: {
          user: result.user,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`회원가입 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 로그인
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ZodBody(loginSchema)
  @ApiOperation({ 
    summary: '사용자 로그인',
    description: '이메일과 비밀번호로 로그인하여 JWT 토큰을 발급받습니다.' 
  })
  @ApiBody({ 
    type: LoginRequestDto,
    description: '로그인 정보',
    examples: {
      student: {
        summary: '학생 계정',
        value: {
          email: 'student1@example.com',
          password: 'password123'
        }
      },
      instructor: {
        summary: '강사 계정',
        value: {
          email: 'instructor1@example.com',
          password: 'password123'
        }
      },
      admin: {
        summary: '관리자 계정',
        value: {
          email: 'admin@example.com',
          password: 'password123'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '잘못된 로그인 정보',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터',
    type: ErrorResponseDto,
  })
  async login(@Body() loginDto: LoginDto, @Req() req: express.Request) {
    try {
      // 🔍 유틸리티 함수로 청리해진 IP 및 에이전트 추출
      const clientIp = extractClientIp(req);
      const userAgent = req.get('User-Agent');

      // 📈 보안 로깅 데이터 준비
      const securityLogData = prepareSecurityLogData(req, {
        action: 'login_attempt',
        email: loginDto.email,
      });

      this.logger.log(`로그인 시도: ${loginDto.email}`, securityLogData);

      const result = await this.authService.login(
        loginDto,
        clientIp,
        userAgent
      );

      return {
        success: true,
        message: '로그인이 완료되었습니다',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`로그인 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 토큰 새로고침
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ZodBody(refreshTokenSchema)
  @ApiOperation({ 
    summary: '토큰 새로고침',
    description: '리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급받습니다.' 
  })
  @ApiBody({ 
    type: RefreshTokenRequestDto,
    description: '리프레시 토큰'
  })
  @ApiResponse({
    status: 200,
    description: '토큰 새로고침 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '토큰이 새로고침되었습니다' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            expiresIn: { type: 'number', example: 900 }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '유효하지 않은 리프레시 토큰',
    type: ErrorResponseDto,
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      // 리프레시 토큰에서 토큰 ID 추출
      const refreshToken = refreshTokenDto.refreshToken;
      const tokenPayload = await this.authService.validateToken(
        refreshToken,
        'refresh'
      );

      if (!tokenPayload) {
        throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
      }

      const tokens = await this.authService.refreshTokens(
        refreshToken,
        tokenPayload.tokenId
      );

      return {
        success: true,
        message: '토큰이 새로고침되었습니다',
        data: tokens,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`토큰 새로고침 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 로그아웃
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: '로그아웃',
    description: '현재 디바이스에서 로그아웃합니다. 액세스 토큰이 무효화됩니다.' 
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '로그아웃이 완료되었습니다' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
    type: ErrorResponseDto,
    examples: {
      'missing-token': {
        summary: '토큰 누락',
        value: {
          success: false,
          statusCode: 401,
          error: 'Unauthorized',
          message: '인증이 필요합니다',
          details: 'Authorization 헤더가 필요합니다. "Bearer <token>" 형식으로 전송해주세요.',
          timestamp: '2025-06-18T02:56:45.000Z',
          path: '/api/v1/auth/logout',
          method: 'POST'
        }
      }
    }
  })
  async logout(
    @CurrentUser('userId') userId: string,
    @Req() req: express.Request
  ) {
    try {
      // 🔍 유틸리티 함수로 토큰 추출
      const accessToken = extractBearerToken(req);
      
      // 📈 보안 로깅
      const securityLogData = prepareSecurityLogData(req, {
        action: 'logout',
        userId,
      });
      
      this.logger.log(`로그아웃 시도: ${userId}`, securityLogData);
      
      await this.authService.logout(userId, accessToken);

      return {
        success: true,
        message: '로그아웃이 완료되었습니다',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`로그아웃 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 모든 기기에서 로그아웃
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: '모든 기기에서 로그아웃',
    description: '사용자의 모든 기기에서 로그아웃합니다. 모든 토큰이 무효화됩니다.' 
  })
  @ApiResponse({
    status: 200,
    description: '전체 로그아웃 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '모든 기기에서 로그아웃되었습니다' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
    type: ErrorResponseDto,
  })
  async logoutFromAllDevices(@CurrentUser('userId') userId: string) {
    try {
      await this.authService.logoutFromAllDevices(userId);

      return {
        success: true,
        message: '모든 기기에서 로그아웃되었습니다',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`전체 로그아웃 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 사용자 프로필 조회 (인증 테스트용)
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: '사용자 프로필 조회',
    description: '현재 로그인한 사용자의 프로필 정보를 조회합니다.' 
  })
  @ApiResponse({
    status: 200,
    description: '프로필 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: 'm3n4o5p6q7r8s9t0u1v2w3x4' },
            id: { type: 'string', example: 'm3n4o5p6q7r8s9t0u1v2w3x4' },
            email: { type: 'string', example: 'student1@example.com' },
            username: { type: 'string', example: 'student_park' },
            name: { type: 'string', example: '박학생' },
            role: { type: 'string', example: 'USER' },
            isVerified: { type: 'boolean', example: true },
            isActive: { type: 'boolean', example: true }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
    type: ErrorResponseDto,
    examples: {
      'missing-token': {
        summary: '토큰 누락',
        value: {
          success: false,
          statusCode: 401,
          error: 'Unauthorized',
          message: '인증이 필요합니다',
          details: 'Authorization 헤더가 필요합니다. "Bearer <token>" 형식으로 전송해주세요.',
          timestamp: '2025-06-18T02:56:45.000Z',
          path: '/api/v1/auth/profile',
          method: 'GET'
        }
      },
      'invalid-token': {
        summary: '유효하지 않은 토큰',
        value: {
          success: false,
          statusCode: 401,
          error: 'Invalid Token',
          message: '유효하지 않은 토큰입니다',
          details: '토큰 형식이 올바르지 않거나 서명이 유효하지 않습니다.',
          timestamp: '2025-06-18T02:56:45.000Z',
          path: '/api/v1/auth/profile',
          method: 'GET'
        }
      },
      'expired-token': {
        summary: '만료된 토큰',
        value: {
          success: false,
          statusCode: 401,
          error: 'Token Expired',
          message: '액세스 토큰이 만료되었습니다',
          details: '새로운 토큰을 발급받기 위해 /auth/refresh 엔드포인트를 사용해주세요.',
          timestamp: '2025-06-18T02:56:45.000Z',
          path: '/api/v1/auth/profile',
          method: 'GET'
        }
      }
    }
  })
  async getProfile(@CurrentUser() user: any) {
    return {
      success: true,
      data: user,
    };
  }

  /**
   * 사용자 프로필 업데이트
   */
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: '사용자 프로필 업데이트',
    description: '현재 로그인한 사용자의 프로필 정보를 업데이트합니다.' 
  })
  @ApiBody({ 
    type: UpdateProfileRequestDto,
    description: '업데이트할 프로필 정보'
  })
  @ApiResponse({
    status: 200,
    description: '프로필 업데이트 성공 (중요 정보 변경 시 새 토큰 포함)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '프로필이 성공적으로 업데이트되었습니다. 새로운 토큰이 발급되었습니다.' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'm3n4o5p6q7r8s9t0u1v2w3x4' },
                email: { type: 'string', example: 'student1@example.com' },
                username: { type: 'string', example: 'new_username' },
                firstName: { type: 'string', example: '김' },
                lastName: { type: 'string', example: '철수' },
                bio: { type: 'string', example: '안녕하세요, 저는 개발자입니다.' },
                location: { type: 'string', example: '서울, 대한민국' },
                website: { type: 'string', example: 'https://example.com' },
                phone: { type: 'string', example: '010-1234-5678' },
                avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                isEmailVerified: { type: 'boolean', example: true },
                createdAt: { type: 'string', example: '2025-06-02T11:00:00.000Z' },
                updatedAt: { type: 'string', example: '2025-06-19T07:58:30.000Z' }
              }
            },
            tokens: {
              type: 'object',
              description: '사용자명, 이름 등 중요 정보 변경 시에만 포함',
              properties: {
                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                expiresIn: { type: 'number', example: 900 },
                tokenType: { type: 'string', example: 'Bearer' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증이 필요합니다',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '이미 사용 중인 사용자명',
    type: ErrorResponseDto,
  })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateProfileDto: any // 임시로 일반 any 타입 사용
  ) {
    try {
      // 수동으로 Zod 스키마 검증
      const validatedData = updateProfileSchema.parse(updateProfileDto);
      
      const result = await this.authService.updateProfile(userId, validatedData);
      
      const response: any = {
        success: true,
        message: result.message,
        data: {
          user: result.user,
        },
      };

      // 새 토큰이 있으면 응답에 포함
      if (result.tokens) {
        response.data.tokens = result.tokens;
        response.message += ' 새로운 토큰이 발급되었습니다.';
      }

      return response;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`프로필 업데이트 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 비밀번호 강도 검사
   */
  @Public()
  @Post('check-password-strength')
  @HttpCode(HttpStatus.OK)
  @ZodBody(passwordStrengthSchema)
  @ApiOperation({ 
    summary: '비밀번호 강도 검사',
    description: '입력한 비밀번호의 강도를 검사합니다.' 
  })
  @ApiBody({ 
    type: PasswordStrengthRequestDto,
    description: '강도를 검사할 비밀번호'
  })
  @ApiResponse({
    status: 200,
    description: '비밀번호 강도 검사 결과',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            password: { type: 'string', example: 'MyStrongPassword123!' },
            score: { type: 'number', example: 5 },
            strength: { type: 'string', example: 'strong' },
            checks: {
              type: 'object',
              properties: {
                length: { type: 'boolean', example: true },
                lowercase: { type: 'boolean', example: true },
                uppercase: { type: 'boolean', example: true },
                numbers: { type: 'boolean', example: true },
                symbols: { type: 'boolean', example: true }
              }
            },
            suggestions: { type: 'array', items: { type: 'string' }, example: [] }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터',
    type: ErrorResponseDto,
  })
  async checkPasswordStrength(@Body() body: { password: string }) {
    try {
      const result = passwordStrengthSchema.parse(body);

      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`비밀번호 강도 검사 실패: ${errorMessage}`);
      throw new BadRequestException('비밀번호 강도 검사에 실패했습니다');
    }
  }

  /**
   * Health check endpoint
   */
  @Public()
  @Get('health')
  @ApiOperation({ 
    summary: '헬스 체크',
    description: '인증 서비스의 상태를 확인합니다.' 
  })
  @ApiResponse({
    status: 200,
    description: '서비스 정상',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'auth-service' },
        timestamp: { type: 'string', example: '2025-06-18T02:56:45.199Z' }
      }
    }
  })
  getHealth() {
    return {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };
  }

  // === 디버깅 메서드들 ===

  /**
   * 사용자 목록 조회 (디버깅용)
   */
  @Public()
  @Get('debug/users')
  @ApiOperation({ 
    summary: '[디버깅] 사용자 목록 조회',
    description: '개발환경에서 전체 사용자 목록을 조회합니다.' 
  })
  @ApiResponse({
    status: 200,
    description: '사용자 목록',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'm3n4o5p6q7r8s9t0u1v2w3x4' },
              email: { type: 'string', example: 'student1@example.com' },
              username: { type: 'string', example: 'student_park' },
              firstName: { type: 'string', example: '박' },
              lastName: { type: 'string', example: '학생' },
              isActive: { type: 'boolean', example: true },
              isEmailVerified: { type: 'boolean', example: true },
              createdAt: { type: 'string', example: '2025-06-02T11:00:00.000Z' },
              updatedAt: { type: 'string', example: '2025-06-17T06:38:24.855Z' }
            }
          }
        }
      }
    }
  })
  async getUsers() {
    try {
      const users = await this.authService.getUsers();
      return {
        success: true,
        data: users,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`사용자 목록 조회 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * JWT 시크릿 확인 (디버깅용)
   */
  @Public()
  @Get('debug/jwt-config')
  @ApiOperation({ 
    summary: '[디버깅] JWT 설정 확인',
    description: '개발환경에서 JWT 설정 상태를 확인합니다.' 
  })
  @ApiResponse({
    status: 200,
    description: 'JWT 설정 정보',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            accessSecret_preview: { type: 'string', example: 'abcd1234...' },
            refreshSecret_preview: { type: 'string', example: 'efgh5678...' },
            expiresIn: { type: 'string', example: '15m' },
            JWT_ACCESS_SECRET_env: { type: 'string', example: 'abcd1234...' },
            REFRESH_TOKEN_SECRET_env: { type: 'string', example: 'efgh5678...' }
          }
        }
      }
    }
  })
  async getJwtConfig() {
    const configService = this.authService['configService'];
    const accessSecret = configService.get<string>('jwt.accessToken.secret');
    const refreshSecret = configService.get<string>('jwt.refreshToken.secret');
    const expiresIn = configService.get<string>('jwt.accessToken.expiresIn');

    return {
      success: true,
      data: {
        accessSecret_preview: accessSecret
          ? accessSecret.substring(0, 8) + '...'
          : 'NONE',
        refreshSecret_preview: refreshSecret
          ? refreshSecret.substring(0, 8) + '...'
          : 'NONE',
        expiresIn,
        JWT_ACCESS_SECRET_env: process.env.JWT_ACCESS_SECRET
          ? process.env.JWT_ACCESS_SECRET.substring(0, 8) + '...'
          : 'NONE',
        REFRESH_TOKEN_SECRET_env: process.env.REFRESH_TOKEN_SECRET
          ? process.env.REFRESH_TOKEN_SECRET.substring(0, 8) + '...'
          : 'NONE',
      },
    };
  }
}
