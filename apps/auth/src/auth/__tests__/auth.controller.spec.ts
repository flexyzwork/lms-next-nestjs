import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UserFixture, AuthFixture } from '../../../test/fixtures/user.fixture';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: '테스트',
    lastName: '사용자',
  };

  const mockRequest = {
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-user-agent'),
    headers: {
      authorization: 'Bearer valid-token',
    },
    connection: {
      remoteAddress: '127.0.0.1'
    },
    socket: {
      remoteAddress: '127.0.0.1'
    }
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            refreshTokens: jest.fn(),
            validateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('유효한 데이터로 회원가입에 성공해야 함', async () => {
      // Arrange
      const registerDto = UserFixture.createValidUser();
      const expectedResult = {
        message: '회원가입이 완료되었습니다',
        user: mockUser,
      };
      authService.register.mockResolvedValue(expectedResult);

      // Act
      const result = await authController.register(registerDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message: expectedResult.message,
        data: expectedResult.user,
      });
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('서비스에서 예외 발생 시 예외를 다시 던져야 함', async () => {
      // Arrange
      const registerDto = UserFixture.createValidUser();
      authService.register.mockRejectedValue(new BadRequestException('이미 존재하는 이메일'));

      // Act & Assert
      await expect(authController.register(registerDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('유효한 자격증명으로 로그인에 성공해야 함', async () => {
      // Arrange
      const loginDto = AuthFixture.createLoginCredentials();
      const expectedResult = {
        user: {
          id: 'user-id-123',
          email: 'test@example.com',
          username: 'testuser',
          isVerified: true,
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };
      authService.login.mockResolvedValue(expectedResult);

      // Act
      const result = await authController.login(loginDto, mockRequest);

      // Assert
      expect(result).toEqual({
        success: true,
        message: '로그인이 완료되었습니다',
        data: expectedResult,
      });
      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '127.0.0.1',
        'test-user-agent'
      );
    });

    it('잘못된 자격증명으로 로그인 시 UnauthorizedException이 발생해야 함', async () => {
      // Arrange
      const loginDto = AuthFixture.createLoginCredentials();
      authService.login.mockRejectedValue(new UnauthorizedException('잘못된 자격증명'));

      // Act & Assert
      await expect(authController.login(loginDto, mockRequest))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('유효한 리프레시 토큰으로 토큰 갱신에 성공해야 함', async () => {
      // Arrange
      const refreshTokenDto = { refreshToken: 'valid-refresh-token' };
      const tokenPayload = AuthFixture.createTokenPayload();
      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      authService.validateToken.mockResolvedValue(tokenPayload);
      authService.refreshTokens.mockResolvedValue(expectedResult);

      // Act
      const result = await authController.refreshToken(refreshTokenDto);

      // Assert
      expect(result).toEqual({
        success: true,
        message: '토큰이 새로고침되었습니다',
        data: expectedResult,
      });
    });

    it('유효하지 않은 리프레시 토큰으로 갱신 시 UnauthorizedException이 발생해야 함', async () => {
      // Arrange
      const refreshTokenDto = { refreshToken: 'invalid-refresh-token' };
      authService.validateToken.mockResolvedValue(null);

      // Act & Assert
      await expect(authController.refreshToken(refreshTokenDto))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('유효한 토큰으로 로그아웃에 성공해야 함', async () => {
      // Arrange
      const userId = 'user-id-123';
      authService.logout.mockResolvedValue(undefined);

      // Act
      const result = await authController.logout(userId, mockRequest);

      // Assert
      expect(result).toEqual({
        success: true,
        message: '로그아웃이 완료되었습니다',
      });
      expect(authService.logout).toHaveBeenCalledWith(userId, 'valid-token');
    });

    it('Authorization 헤더가 없으면 UnauthorizedException이 발생해야 함', async () => {
      // Arrange
      const userId = 'user-id-123';
      const requestWithoutAuth = { ...mockRequest, headers: {} };

      // Act & Assert
      await expect(authController.logout(userId, requestWithoutAuth))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('인증된 사용자의 프로필을 반환해야 함', async () => {
      // Arrange
      const user = mockUser;

      // Act
      const result = await authController.getProfile(user);

      // Assert
      expect(result).toEqual({
        success: true,
        data: user,
      });
    });
  });


  describe('checkPasswordStrength', () => {
    it('비밀번호 강도를 확인해야 함', async () => {
      // Arrange
      const body = { password: 'StrongP@ssw0rd!' };

      // Act
      const result = await authController.checkPasswordStrength(body);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          password: body.password,
        }),
      });
    });

    it('약한 비밀번호의 검증 결과가 성공적으로 반환되어야 함', async () => {
      // Arrange
      const body = { password: '123' };

      // Act
      const result = await authController.checkPasswordStrength(body);

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          password: body.password,
          strength: 'weak',
          score: expect.any(Number),
          checks: expect.any(Object),
          suggestions: expect.any(Array)
        })
      });
    });
  });
});
