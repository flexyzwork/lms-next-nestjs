import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { RedisService } from '@packages/database';
import { PrismaService } from '@packages/database';
import { UserFixture, AuthFixture } from '../../../test/fixtures/user.fixture';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    password: 'hashed-password',
    username: 'testuser',
    firstName: '테스트',
    lastName: '사용자',
    isActive: true,
    isVerified: true,
    lastLoginAt: new Date(),
    passwordChangedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    socialAccounts: [],
    profile: {
      id: 'profile-id-123',
      bio: '테스트 소개글',
      location: '서울',
      website: 'https://example.com',
      dateOfBirth: new Date('1990-01-01'),
      phone: '010-1234-5678',
      userId: 'user-id-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    settings: {
      id: 'settings-id-123',
      language: 'ko',
      theme: 'light',
      timezone: 'Asia/Seoul',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      twoFactorEnabled: false,
      userId: 'user-id-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    avatar: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateLastLogin: jest.fn(),
            validatePassword: jest.fn(),
          } as any,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            signAsync: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          } as any,
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            isBlacklisted: jest.fn(),
            getLoginAttempts: jest.fn(),
            incrementLoginAttempts: jest.fn(),
            resetLoginAttempts: jest.fn(),
            storeRefreshToken: jest.fn(),
            addToBlacklist: jest.fn(),
            isRefreshTokenValid: jest.fn(),
            removeRefreshToken: jest.fn(),
            blacklistUserTokens: jest.fn(),
          } as any,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                'jwt.accessToken.secret': 'test-secret',
                'jwt.refreshToken.secret': 'test-refresh-secret',
                'jwt.accessToken.expiresIn': '15m',
                'jwt.refreshToken.expiresIn': '7d',
              };
              return config[key];
            }),
          } as any,
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            loginHistory: {
              create: jest.fn().mockResolvedValue({}),
            },
          } as any,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('새로운 사용자 회원가입에 성공해야 함', async () => {
      // Arrange
      const registerDto = UserFixture.createValidUser();

      // 간단한 모킹 데이터
      const mockCreatedUser = {
        id: 'user-id-123',
        email: registerDto.email,
        username: registerDto.username,
        isVerified: false,
      };

      usersService.create.mockResolvedValue(mockCreatedUser as any);

      // Act
      const result = await authService.register(registerDto);

      // Assert
      expect(result).toEqual({
        message: '회원가입이 완료되었습니다',
        user: {
          id: mockCreatedUser.id,
          email: mockCreatedUser.email,
          username: mockCreatedUser.username,
          isVerified: mockCreatedUser.isVerified,
        },
      });
      expect(usersService.create).toHaveBeenCalledWith(registerDto);
    });

    it('이미 존재하는 이메일로 회원가입 시 ConflictException이 발생해야 함', async () => {
      // Arrange
      const registerDto = UserFixture.createValidUser();
      usersService.create.mockRejectedValue(new ConflictException('이미 사용 중인 이메일입니다'));

      // Act & Assert
      await expect(authService.register(registerDto))
        .rejects.toThrow(ConflictException);

      expect(usersService.create).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    const loginDto = AuthFixture.createLoginCredentials();
    const clientIp = '127.0.0.1';
    const userAgent = 'test-agent';

    it('유효한 자격증명으로 로그인에 성공해야 함', async () => {
      // Arrange
      const loginDto = AuthFixture.createLoginCredentials();
      const clientIp = '127.0.0.1';
      const userAgent = 'test-agent';

      // 모킹 설정
      redisService.getLoginAttempts.mockResolvedValue(0); // 브루트 포스 체크 통과
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.validatePassword.mockResolvedValue(true);

      // JWT 토큰 생성 모킹
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      redisService.storeRefreshToken.mockResolvedValue(undefined);
      redisService.incrementLoginAttempts.mockResolvedValue(undefined);
      redisService.resetLoginAttempts.mockResolvedValue(undefined);
      usersService.updateLastLogin.mockResolvedValue(undefined);

      // Act
      const result = await authService.login(loginDto, clientIp, userAgent);

      // Assert
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          isVerified: mockUser.isVerified,
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('존재하지 않는 사용자로 로그인 시 UnauthorizedException이 발생해야 함', async () => {
      // Arrange
      const loginDto = AuthFixture.createLoginCredentials();
      redisService.getLoginAttempts.mockResolvedValue(0);
      usersService.findByEmail.mockResolvedValue(null);
      redisService.incrementLoginAttempts.mockResolvedValue(undefined);

      // Act & Assert
      await expect(authService.login(loginDto, '127.0.0.1', 'test-agent'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('잘못된 비밀번호로 로그인 시 UnauthorizedException이 발생해야 함', async () => {
      // Arrange
      const loginDto = AuthFixture.createLoginCredentials();
      redisService.getLoginAttempts.mockResolvedValue(0);
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.validatePassword.mockResolvedValue(false);
      redisService.incrementLoginAttempts.mockResolvedValue(undefined);

      // Act & Assert
      await expect(authService.login(loginDto, '127.0.0.1', 'test-agent'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('비활성화된 사용자로 로그인 시 UnauthorizedException이 발생해야 함', async () => {
      // Arrange
      const loginDto = AuthFixture.createLoginCredentials();
      const inactiveUser = { ...mockUser, isActive: false };
      redisService.getLoginAttempts.mockResolvedValue(0);
      usersService.findByEmail.mockResolvedValue(inactiveUser as any);
      redisService.incrementLoginAttempts.mockResolvedValue(undefined);

      // Act & Assert
      await expect(authService.login(loginDto, '127.0.0.1', 'test-agent'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('유효한 토큰으로 로그아웃에 성공해야 함', async () => {
      // Arrange
      const userId = 'user-id-123';
      const accessToken = 'valid-access-token';
      const tokenPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // 1시간 후 만료

      jwtService.decode.mockReturnValue(tokenPayload as any);
      redisService.addToBlacklist.mockResolvedValue(undefined);

      // Act
      await authService.logout(userId, accessToken);

      // Assert
      expect(jwtService.decode).toHaveBeenCalledWith(accessToken);
      expect(redisService.addToBlacklist).toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('유효한 액세스 토큰을 검증해야 함', async () => {
      // Arrange
      const token = 'valid-access-token';
      const tokenPayload = AuthFixture.createTokenPayload();

      jwtService.verify.mockReturnValue(tokenPayload);
      redisService.isBlacklisted.mockResolvedValue(false); // 블랙리스트에 없음

      // Act
      const result = await authService.validateToken(token, 'access');

      // Assert
      expect(result).toEqual(tokenPayload);
      expect(jwtService.verify).toHaveBeenCalledWith(token, { secret: 'test-secret' });
      expect(redisService.isBlacklisted).toHaveBeenCalledWith(token);
    });

    it('블랙리스트에 있는 토큰은 null을 반환해야 함', async () => {
      // Arrange
      const token = 'blacklisted-token';
      const tokenPayload = AuthFixture.createTokenPayload();
      jwtService.verify.mockReturnValue(tokenPayload);
      redisService.isBlacklisted.mockResolvedValue(true); // 블랙리스트에 있음

      // Act
      const result = await authService.validateToken(token, 'access');

      // Assert
      expect(result).toBeNull();
      expect(redisService.isBlacklisted).toHaveBeenCalledWith(token);
    });

    it('만료된 토큰은 null을 반환해야 함', async () => {
      // Arrange
      const token = 'expired-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('TokenExpiredError');
      });

      // Act
      const result = await authService.validateToken(token, 'access');

      // Assert
      expect(result).toBeNull();
      expect(jwtService.verify).toHaveBeenCalledWith(token, { secret: 'test-secret' });
    });
  });

  describe('refreshTokens', () => {
    it('유효한 리프레시 토큰으로 새 토큰들을 발급해야 함', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const tokenId = 'token-id-123';
      const tokenPayload = { sub: mockUser.id, tokenId };

      jwtService.verify.mockReturnValue(tokenPayload);
      redisService.isRefreshTokenValid.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(mockUser as any);
      redisService.removeRefreshToken.mockResolvedValue(undefined);

      // JWT 토큰 생성 모킹
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      redisService.storeRefreshToken.mockResolvedValue(undefined);

      // Act
      const result = await authService.refreshTokens(refreshToken, tokenId);

      // Assert
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(redisService.removeRefreshToken).toHaveBeenCalledWith(mockUser.id, tokenId);
    });
  });
});
