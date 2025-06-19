import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService, RedisService } from '@packages/database';
import { generateId, parseTimeString } from '@packages/common'; // 🆔 CUID2 생성 유틸리티
import { RegisterDto, LoginDto, UpdateProfileDto } from '@packages/schemas';
import {
  JwtPayload,
  JwtRefreshPayload,
  SocialUser,
  TokenPair,
  LoginResponse,
} from './interfaces/auth.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  // 🔐 보안 설정값들 - 환경변수에서 동적으로 로드
  private readonly maxLoginAttempts: number;
  private readonly lockoutDuration: number;
  private readonly maxIpAttempts: number;
  private readonly logAuthAttempts: boolean;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private prismaService: PrismaService
  ) {
    // 🔐 보안 설정값 초기화
    const securityConfig = this.configService.get('security.bruteForce');
    this.maxLoginAttempts = securityConfig?.maxLoginAttempts || 5;
    this.lockoutDuration = (securityConfig?.lockoutDurationMinutes || 15) * 60; // 분 -> 초 변환
    this.maxIpAttempts = securityConfig?.maxIpAttempts || 10;
    this.logAuthAttempts = this.configService.get('security.logging.logAuthAttempts', true);

    // 🔍 설정 상태 로깅
    this.logger.log('🔐 보안 설정 로드 완료:');
    this.logger.log(`  - 최대 로그인 시도: ${this.maxLoginAttempts}회`);
    this.logger.log(`  - 계정 잠금 시간: ${this.lockoutDuration / 60}분`);
    this.logger.log(`  - IP별 최대 시도: ${this.maxIpAttempts}회`);
    this.logger.log(`  - 인증 로깅: ${this.logAuthAttempts ? '활성화' : '비활성화'}`);

    // JWT 설정 디버깅 (개발 환경에서만)
    if (this.configService.get('security.logging.logSensitiveData', false)) {
      const accessSecret = this.configService.get<string>('jwt.accessToken.secret');
      const refreshSecret = this.configService.get<string>('jwt.refreshToken.secret');
      const expiresIn = this.configService.get<string>('jwt.accessToken.expiresIn');

      this.logger.debug('🔍 JWT 설정 상태:');
      this.logger.debug(`  - Access Secret: ${accessSecret ? accessSecret.substring(0, 8) + '...' : '없음'}`);
      this.logger.debug(`  - Refresh Secret: ${refreshSecret ? refreshSecret.substring(0, 8) + '...' : '없음'}`);
      this.logger.debug(`  - Expires In: ${expiresIn}`);
    }
  }

  /**
   * 사용자 회원가입
   * @param registerDto 회원가입 데이터
   * @returns 회원가입 결과
   */
  async register(
    registerDto: RegisterDto
  ): Promise<{ message: string; user: any }> {
    try {
      const user = await this.usersService.create(registerDto);

      // 로그인 히스토리 기록
      await this.createLoginHistory({
        userId: user.id,
        email: user.email,
        success: true,
        provider: 'local',
      });

      this.logger.log(`새 사용자 회원가입: ${user.email}`);

      return {
        message: '회원가입이 완료되었습니다',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isVerified, // isVerified -> isEmailVerified 매핑
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('회원가입 처리 중 오류:', error);

      // 알려진 에러 타입에 따른 메시지 처리
      if (error instanceof ConflictException) {
        throw error; // 이미 사용 중인 이메일/사용자명 에러
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다';
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * 사용자 로그인
   * @param loginDto 로그인 데이터
   * @param ipAddress 클라이언트 IP 주소
   * @param userAgent 사용자 에이전트
   * @returns 로그인 결과
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    const { email, password } = loginDto;

    // 브루트 포스 공격 방지 체크
    await this.checkBruteForceProtection(email, ipAddress);

    try {
      // 사용자 조회
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        await this.handleFailedLogin(email, ipAddress, userAgent);
        throw new UnauthorizedException(
          '이메일 또는 비밀번호가 올바르지 않습니다'
        );
      }

      // 비밀번호 검증
      if (
        !user.password ||
        !(await this.usersService.validatePassword(password, user.password))
      ) {
        await this.handleFailedLogin(email, ipAddress, userAgent);
        throw new UnauthorizedException(
          '이메일 또는 비밀번호가 올바르지 않습니다'
        );
      }

      // 계정 활성화 상태 확인
      if (!user.isActive) {
        await this.handleFailedLogin(email, ipAddress, userAgent);
        throw new UnauthorizedException('비활성화된 계정입니다');
      }

      // 로그인 성공 처리
      await this.handleSuccessfulLogin(user.id, email, ipAddress, userAgent);

      // 토큰 생성
      const tokens = await this.generateTokenPair(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username || '',
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isVerified, // isVerified -> isEmailVerified 매핑
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        tokens,
      };
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        this.logger.error(`로그인 처리 중 오류: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * 소셜 로그인 처리
   * @param socialUser 소셜 사용자 정보
   * @returns 로그인 결과
   */
  async handleSocialLogin(socialUser: SocialUser): Promise<LoginResponse> {
    try {
      let user: any = await this.usersService.findBySocialAccount(
        socialUser.provider,
        socialUser.providerId
      );

      if (!user) {
        // 이메일로 기존 사용자 찾기
        const existingUser = await this.usersService.findByEmail(
          socialUser.email
        );

        if (existingUser) {
          // 기존 사용자에 소셜 계정 연결
          await this.usersService.linkSocialAccount(existingUser.id, {
            provider: socialUser.provider,
            providerId: socialUser.providerId,
            providerData: {
              accessToken: socialUser.accessToken,
              refreshToken: socialUser.refreshToken,
            },
          });

          user = await this.usersService.findById(existingUser.id);
        } else {
          // 새 사용자 생성
          user = await this.usersService.createWithSocialAccount({
            providerId: socialUser.providerId,
            provider: socialUser.provider,
            email: socialUser.email,
            firstName: socialUser.firstName,
            lastName: socialUser.lastName,
            username: socialUser.username,
            avatar: socialUser.avatar,
            providerData: {
              accessToken: socialUser.accessToken,
              refreshToken: socialUser.refreshToken,
            },
          });
        }
      }

      // 로그인 히스토리 기록
      await this.createLoginHistory({
        userId: user.id,
        email: user.email,
        success: true,
        provider: socialUser.provider,
      });

      // 마지막 로그인 시간 업데이트
      await this.usersService.updateLastLogin(user.id);

      // 토큰 생성
      const tokens = await this.generateTokenPair(user);

      this.logger.log(
        `소셜 로그인 성공: ${user.email} (${socialUser.provider})`
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isVerified, // isVerified -> isEmailVerified 매핑
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        tokens,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`소셜 로그인 처리 중 오류: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 토큰 새로고침
   * @param refreshToken 리프레시 토큰
   * @param tokenId 토큰 ID
   * @returns 새로운 토큰 쌍
   */
  async refreshTokens(
    refreshToken: string,
    tokenId: string
  ): Promise<TokenPair> {
    try {
      // 리프레시 토큰 검증
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshToken.secret'),
      }) as JwtRefreshPayload;

      // Redis에서 토큰 유효성 확인
      if (
        !(await this.redisService.isRefreshTokenValid(payload.sub, tokenId))
      ) {
        throw new UnauthorizedException('리프레시 토큰이 유효하지 않습니다');
      }

      // 사용자 조회
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException(
          '사용자를 찾을 수 없거나 비활성화되었습니다'
        );
      }

      // 기존 리프레시 토큰 무효화
      await this.redisService.removeRefreshToken(payload.sub, tokenId);

      // 새로운 토큰 쌍 생성
      const tokens = await this.generateTokenPair(user);

      this.logger.debug(`토큰 새로고침 완료: ${user.email}`);

      return tokens;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`토큰 새로고침 실패: ${errorMessage}`);
      throw new UnauthorizedException('토큰 새로고침에 실패했습니다');
    }
  }

  /**
   * 로그아웃
   * @param userId 사용자 ID
   * @param accessToken 액세스 토큰
   * @param refreshTokenId 리프레시 토큰 ID (선택적)
   */
  async logout(
    userId: string,
    accessToken: string,
    refreshTokenId?: string
  ): Promise<void> {
    try {
      // 액세스 토큰을 블랙리스트에 추가
      const tokenPayload = this.jwtService.decode(accessToken) as JwtPayload;
      if (tokenPayload && tokenPayload.exp) {
        const expiresIn = tokenPayload.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await this.redisService.addToBlacklist(accessToken, expiresIn);
        }
      }

      // 특정 리프레시 토큰 무효화 또는 모든 토큰 무효화
      if (refreshTokenId) {
        await this.redisService.removeRefreshToken(userId, refreshTokenId);
      } else {
        await this.redisService.blacklistUserTokens(userId);
      }

      this.logger.log(`사용자 로그아웃: ${userId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`로그아웃 처리 중 오류: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 모든 기기에서 로그아웃
   * @param userId 사용자 ID
   */
  async logoutFromAllDevices(userId: string): Promise<void> {
    try {
      await this.redisService.blacklistUserTokens(userId);
      this.logger.log(`사용자의 모든 기기에서 로그아웃: ${userId}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`전체 로그아웃 처리 중 오류: ${error.message}`);
      } else {
        this.logger.error(
          '전체 로그아웃 처리 중 알 수 없는 오류가 발생했습니다.'
        );
      }
      throw error;
    }
  }

  /**
   * 토큰 쌍 생성
   * 
   * 비즈니스 로직:
   * 1. JWT 페이로드 생성 (sub 클레임 사용)
   * 2. 리프레시 토큰에 고유 ID 추가
   * 3. 비동기로 동시 생성
   * 4. Redis에 리프레시 토큰 저장
   * 5. 만료 시간 계산 및 반환
   * 
   * @param user 사용자 정보
   * @returns 토큰 쌍 (accessToken, refreshToken, expiresIn, tokenType)
   */
  private async generateTokenPair(user: any): Promise<TokenPair> {
    // 표준 JWT 페이로드 (중복 필드 제거)
    const payload: JwtPayload = {
      sub: user.id, // 표준 JWT 'sub' 클레임
      email: user.email,
      username: user.username,
      role: user.role || 'user',
    };

    // 리프레시 토큰용 고유 ID 생성
    const tokenId = uuidv4();
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      tokenId,
    };

    this.logger.debug('🔑 JWT 토큰 생성 - 페이로드:', {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    });

    try {
      // 토큰 생성
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          secret: this.configService.get<string>('jwt.accessToken.secret'),
          expiresIn: this.configService.get<string>('jwt.accessToken.expiresIn'),
        }),
        this.jwtService.signAsync(refreshPayload, {
          secret: this.configService.get<string>('jwt.refreshToken.secret'),
          expiresIn: this.configService.get<string>('jwt.refreshToken.expiresIn'),
        }),
      ]);

      this.logger.log(`✅ JWT 토큰 생성 완료 - 사용자: ${user.email}`);
      this.logger.debug('🔍 생성된 Access Token 미리보기:', accessToken.substring(0, 50) + '...');

      // 리프레시 토큰을 Redis에 저장 (유틸리티 함수 사용)
      const refreshExpiresIn = parseTimeString(
        this.configService.get<string>('jwt.refreshToken.expiresIn', '7d')
      );
      await this.redisService.storeRefreshToken(user.id, tokenId, refreshExpiresIn);

      // 만료 시간 계산 (유틸리티 함수 사용)
      const accessExpiresIn = parseTimeString(
        this.configService.get<string>('jwt.accessToken.expiresIn', '15m')
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: accessExpiresIn,
        tokenType: 'Bearer'
      };
    } catch (error) {
      this.logger.error('😱 JWT 토큰 생성 실패:', error);
      throw new Error(`토큰 생성에 실패했습니다: ${error.message}`);
    }
  }

  /**
   * 브루트 포스 공격 방지 체크
   * @param identifier 식별자 (이메일 또는 IP)
   * @param ipAddress IP 주소
   */
  private async checkBruteForceProtection(
    identifier: string,
    ipAddress?: string
  ): Promise<void> {
    const emailAttempts = await this.redisService.getLoginAttempts(identifier);
    const ipAttempts = ipAddress
      ? await this.redisService.getLoginAttempts(ipAddress)
      : 0;

    // 🔐 동적 설정값 사용
    if (
      emailAttempts >= this.maxLoginAttempts ||
      ipAttempts >= this.maxIpAttempts
    ) {
      const lockoutMinutes = this.lockoutDuration / 60;
      throw new BadRequestException(
        `너무 많은 로그인 시도가 있었습니다. ${lockoutMinutes}분 후에 다시 시도해주세요.`
      );
    }
  }

  /**
   * 로그인 실패 처리
   * @param email 이메일
   * @param ipAddress IP 주소
   * @param userAgent 사용자 에이전트
   */
  private async handleFailedLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // 실패 횟수 증가 (동적 설정값 사용)
    await this.redisService.incrementLoginAttempts(
      email,
      this.lockoutDuration
    );
    if (ipAddress) {
      await this.redisService.incrementLoginAttempts(
        ipAddress,
        this.lockoutDuration
      );
    }

    // 로그인 히스토리 기록 (설정에 따라 선택적)
    if (this.logAuthAttempts) {
      await this.createLoginHistory({
        email,
        success: false,
        ipAddress,
        userAgent,
        provider: 'local',
      });
    }

    this.logger.warn(`로그인 실패: ${email} (IP: ${ipAddress})`);
  }

  /**
   * 로그인 성공 처리
   * @param userId 사용자 ID
   * @param email 이메일
   * @param ipAddress IP 주소
   * @param userAgent 사용자 에이전트
   */
  private async handleSuccessfulLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // 실패 횟수 초기화
    await this.redisService.resetLoginAttempts(email);
    if (ipAddress) {
      await this.redisService.resetLoginAttempts(ipAddress);
    }

    // 마지막 로그인 시간 업데이트
    await this.usersService.updateLastLogin(userId);

    // 로그인 히스토리 기록 (설정에 따라 선택적)
    if (this.logAuthAttempts) {
      await this.createLoginHistory({
        userId,
        email,
        success: true,
        ipAddress,
        userAgent,
        provider: 'local',
      });
    }

    this.logger.log(`로그인 성공: ${email} (IP: ${ipAddress})`);
  }

  /**
   * 로그인 히스토리 생성
   * @param data 로그인 히스토리 데이터
   */
  private async createLoginHistory(data: {
    userId?: string;
    email: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    provider?: string;
  }): Promise<void> {
    try {
      const historyId = generateId(); // 🆔 CUID2 ID 생성
      
      await this.prismaService.loginHistory.create({
        data: {
          id: historyId, // 🆔 CUID2 ID 직접 지정
          ...data,
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '로그인 히스토리 저장 실패';
      this.logger.error(`로그인 히스토리 저장 실패: ${errorMessage}`);
      // 히스토리 저장 실패는 전체 로그인 프로세스에 영향 주지 않음
    }
  }

  /**
   * 토큰 유효성 검증
   * @param token JWT 토큰
   * @param type 토큰 타입 ('access' | 'refresh')
   * @returns 검증 결과
   */
  async validateToken(
    token: string,
    type: 'access' | 'refresh' = 'access'
  ): Promise<any> {
    try {
      const secret =
        type === 'access'
          ? this.configService.get<string>('jwt.accessToken.secret')
          : this.configService.get<string>('jwt.refreshToken.secret');

      const payload = this.jwtService.verify(token, { secret });

      // 액세스 토큰인 경우 블랙리스트 확인
      if (type === 'access' && (await this.redisService.isBlacklisted(token))) {
        return null;
      }

      // 리프레시 토큰인 경우 Redis 저장소 확인
      if (type === 'refresh') {
        const refreshPayload = payload as JwtRefreshPayload;
        if (
          !(await this.redisService.isRefreshTokenValid(
            refreshPayload.sub,
            refreshPayload.tokenId
          ))
        ) {
          return null;
        }
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 사용자 프로필 업데이트
   * @param userId 사용자 ID
   * @param updateProfileDto 업데이트할 프로필 데이터
   * @returns 업데이트된 사용자 정보와 새로운 토큰
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto
  ): Promise<{ message: string; user: any; tokens?: any }> {
    try {
      // 사용자 존재 여부 확인
      const existingUser = await this.usersService.findById(userId);
      if (!existingUser) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다');
      }

      // 프로필 업데이트
      const updatedUser = await this.usersService.updateProfile(
        userId,
        updateProfileDto
      );

      // 중요한 정보(사용자명, 이메일 등)가 변경된 경우 새 토큰 발급
      let newTokens = null;
      const shouldRefreshToken = 
        updateProfileDto.username || 
        updateProfileDto.firstName || 
        updateProfileDto.lastName;

      if (shouldRefreshToken) {
        // 업데이트된 사용자 정보로 새 토큰 생성
        newTokens = await this.generateTokenPair(updatedUser);
        this.logger.log(`프로필 업데이트로 인한 토큰 갱신: ${updatedUser.email}`);
      }

      this.logger.log(`사용자 프로필 업데이트: ${updatedUser.email}`);

      return {
        message: '프로필이 성공적으로 업데이트되었습니다',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          bio: updatedUser.profile?.bio,
          location: updatedUser.profile?.location,
          website: updatedUser.profile?.website,
          dateOfBirth: updatedUser.profile?.dateOfBirth,
          phone: updatedUser.profile?.phone,
          avatar: updatedUser.avatar,
          isEmailVerified: updatedUser.isVerified,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        },
        ...(newTokens && { tokens: newTokens }), // 새 토큰이 있으면 포함
      };
    } catch (error) {
      this.logger.error('프로필 업데이트 처리 중 오류:', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof ConflictException) {
        throw error; // 중복된 사용자명 등
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다';
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * 모든 사용자 조회 (디버깅용)
   * @returns 사용자 목록
   */
  async getUsers(): Promise<any[]> {
    try {
      const result = await this.usersService.findMany({
        filter: {},
        orderBy: { createdAt: 'desc' },
        page: 1,
        limit: 100, // Default limit of 100 users
      });

      // Access the users array from the paginated result
      return result.users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isEmailVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`사용자 목록 조회 실패: ${errorMessage}`);
      throw error;
    }
  }
}
