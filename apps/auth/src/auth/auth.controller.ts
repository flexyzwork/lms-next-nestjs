import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
  SetMetadata,
  createParamDecorator,
  UsePipes,
} from '@nestjs/common';
import express from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// 임시로 직접 정의
const IS_PUBLIC_KEY = 'isPublic';
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

const CurrentUser = createParamDecorator((data: string, ctx: any) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  
  if (!user) {
    throw new BadRequestException('User not found');
  }
  
  if (data) {
    return user[data];
  }
  
  return user;
});

// ZodBody 데코레이터
const ZodBody = (schema: any) => {
  return (target: any, propertyKey: string | symbol | undefined, descriptor: PropertyDescriptor) => {
    // 스키마 검증 로직을 여기서 구현할 수도 있지만 일단 기본만
    return descriptor;
  };
};

// Zod 스키마 import from unified schemas package
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordStrengthSchema,
  type RegisterDto,
  type LoginDto,
  type RefreshTokenDto,
} from '@packages/schemas';

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
  async login(@Body() loginDto: LoginDto, @Req() req: express.Request) {
    try {
      const clientIp = this.getClientIp(req);
      const userAgent = req.get('User-Agent');

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
  async logout(
    @CurrentUser('userId') userId: string,
    @Req() req: express.Request
  ) {
    try {
      const accessToken = this.extractTokenFromHeader(req);
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
   * 사용자 목록 조회 (디버깅용)
   */
  @Public()
  @Get('debug/users')
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
   * Health check endpoint
   */
  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 사용자 프로필 조회 (인증 테스트용)
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return {
      success: true,
      data: user,
    };
  }

  /**
   * 비밀번호 강도 검사
   */
  @Public()
  @Post('check-password-strength')
  @HttpCode(HttpStatus.OK)
  @ZodBody(passwordStrengthSchema)
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
   * JWT 시크릿 확인 (디버깅용)
   */
  @Public()
  @Get('debug/jwt-config')
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

  // === 유틸리티 메서드 ===

  /**
   * 클라이언트 IP 주소 추출
   * @param req Request 객체
   * @returns IP 주소
   */
  private getClientIp(req: express.Request): string {
    return ((req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip ||
      '알 수 없음') as string;
  }

  /**
   * Authorization 헤더에서 토큰 추출
   * @param req Request 객체
   * @returns JWT 토큰
   */
  private extractTokenFromHeader(req: express.Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer 토큰이 필요합니다');
    }
    return authHeader.substring(7);
  }
}
