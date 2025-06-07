import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@packages/database';
import { CreateUserDto, UpdateUserDto } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  /**
   * 사용자 생성
   * @param createUserDto 사용자 생성 데이터
   * @returns 생성된 사용자
   */
  async create(createUserDto: CreateUserDto) {
    const { email, password, username, firstName, lastName } = createUserDto;

    // 이메일 중복 확인
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다');
    }

    // 사용자명 중복 확인 (있는 경우)
    if (username) {
      const existingUsername = await this.findByUsername(username);
      if (existingUsername) {
        throw new ConflictException('이미 사용 중인 사용자명입니다');
      }
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성
    const user = await this.prismaService.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        firstName,
        lastName,
        // 기본 프로필과 설정 생성
        profile: {
          create: {},
        },
        settings: {
          create: {},
        },
      },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true,
      },
    });

    // 비밀번호 제외하고 반환
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * ID로 사용자 조회
   * @param id 사용자 ID
   * @returns 사용자 정보
   */
  async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true, // 전체 소셜 계정 정보 포함
      },
    });

    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 이메일로 사용자 조회 (비밀번호 포함)
   * @param email 이메일
   * @returns 사용자 정보
   */
  async findByEmail(email: string) {
    return await this.prismaService.user.findUnique({
      where: { email },
      include: {
        socialAccounts: true,
      },
    });
  }

  /**
   * 사용자명으로 사용자 조회
   * @param username 사용자명
   * @returns 사용자 정보
   */
  async findByUsername(username: string) {
    return await this.prismaService.user.findUnique({
      where: { username },
    });
  }

  /**
   * 소셜 계정으로 사용자 조회
   * @param provider 소셜 플랫폼
   * @param providerId 플랫폼 사용자 ID
   * @returns 사용자 정보
   */
  async findBySocialAccount(provider: string, providerId: string) {
    const socialAccount = await this.prismaService.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: {
          include: {
            profile: true,
            settings: true,
            socialAccounts: true,
          },
        },
      },
    });

    return socialAccount?.user || null;
  }

  /**
   * 소셜 계정과 사용자 생성
   * @param socialData 소셜 로그인 데이터
   * @returns 생성된 사용자
   */
  async createWithSocialAccount(socialData: {
    providerId: string;
    provider: string;
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
    providerData?: any;
  }) {
    const {
      providerId,
      provider,
      email,
      firstName,
      lastName,
      username,
      avatar,
      providerData,
    } = socialData;

    // 고유한 사용자명 생성 (중복 시)
    let uniqueUsername = username;
    if (username) {
      let counter = 1;
      while (await this.findByUsername(uniqueUsername)) {
        uniqueUsername = `${username}${counter}`;
        counter++;
      }
    }

    const user = await this.prismaService.user.create({
      data: {
        email,
        firstName,
        lastName,
        username: uniqueUsername,
        avatar,
        isVerified: true, // 소셜 로그인은 이메일 인증됨으로 간주
        profile: {
          create: {},
        },
        settings: {
          create: {},
        },
        socialAccounts: {
          create: {
            provider,
            providerId,
            providerData,
          },
        },
      },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 기존 사용자에 소셜 계정 연결
   * @param userId 사용자 ID
   * @param socialData 소셜 계정 데이터
   */
  async linkSocialAccount(
    userId: string,
    socialData: {
      providerId: string;
      provider: string;
      providerData?: any;
    },
  ) {
    const { providerId, provider, providerData } = socialData;

    return await this.prismaService.socialAccount.create({
      data: {
        userId,
        provider,
        providerId,
        providerData,
      },
    });
  }

  /**
   * 사용자 정보 업데이트
   * @param id 사용자 ID
   * @param updateUserDto 업데이트 데이터
   * @returns 업데이트된 사용자
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    const { password, ...updateData } = updateUserDto;
    let hashedPassword: string | undefined;

    // 비밀번호 변경 시 해시화
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: {
        ...updateData,
        ...(hashedPassword && {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        }),
      },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true,
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * 비밀번호 검증
   * @param plainPassword 평문 비밀번호
   * @param hashedPassword 해시된 비밀번호
   * @returns 검증 결과
   */
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 사용자 활성화/비활성화
   * @param id 사용자 ID
   * @param isActive 활성화 상태
   */
  async updateActiveStatus(id: string, isActive: boolean) {
    return await this.prismaService.user.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * 사용자 이메일 인증 완료
   * @param id 사용자 ID
   */
  async markEmailAsVerified(id: string) {
    return await this.prismaService.user.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  /**
   * 마지막 로그인 시간 업데이트
   * @param id 사용자 ID
   */
  async updateLastLogin(id: string) {
    return await this.prismaService.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * 사용자 프로필 업데이트
   * @param userId 사용자 ID
   * @param profileData 프로필 데이터
   */
  async updateProfile(userId: string, profileData: any) {
    return await this.prismaService.userProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
      },
    });
  }

  /**
   * 사용자 설정 업데이트
   * @param userId 사용자 ID
   * @param settingsData 설정 데이터
   */
  async updateSettings(userId: string, settingsData: any) {
    try {
      // 사용자가 존재하는지 확인
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다');
      }

      return await this.prismaService.userSettings.upsert({
        where: { userId },
        update: settingsData,
        create: {
          userId,
          ...settingsData,
        },
      });
    } catch (error) {
      console.error('Settings update error:', error);
      throw error;
    }
  }

  /**
   * 사용자 목록 조회 (페이지네이션 지원)
   * @param options 조회 옵션
   */
  async findMany(options: {
    filter?: any;
    orderBy?: any;
    page: number;
    limit: number;
  }) {
    console.log('=== UsersService.findMany 시작 ===');
    console.log('입력 옵션:', JSON.stringify(options, null, 2));

    const { filter, orderBy, page, limit } = options;
    const skip = (page - 1) * limit;

    console.log(`계산된 skip: ${skip}`);

    try {
      // 전체 사용자 수 조회
      console.log('전체 사용자 수 조회 시작...');
      const totalItems = await this.prismaService.user.count({
        where: filter,
      });
      console.log(`전체 사용자 수: ${totalItems}`);

      // 사용자 목록 조회
      console.log('사용자 목록 조회 시작...');
      const users = await this.prismaService.user.findMany({
        where: filter,
        orderBy,
        skip,
        take: limit,
        include: {
          profile: true,
          settings: true,
          socialAccounts: {
            select: {
              provider: true,
              createdAt: true,
            },
          },
        },
      });
      console.log(`조회된 사용자 수: ${users.length}`);

      // 비밀번호 제거
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      console.log(`비밀번호 제거 후 사용자 수: ${usersWithoutPassword.length}`);

      // 페이지네이션 계산
      const totalPages = Math.ceil(totalItems / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      const result = {
        users: usersWithoutPassword,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage,
          hasPreviousPage,
        },
      };

      console.log('최종 결과:', {
        usersCount: result.users.length,
        pagination: result.pagination
      });
      console.log('=== UsersService.findMany 완료 ===');

      return result;
    } catch (error) {
      console.error('UsersService.findMany 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자 수 조회 (디버깅용)
   */
  async getUserCount(): Promise<number> {
    return await this.prismaService.user.count();
  }

  /**
   * 사용자 삭제 (소프트 삭제)
   * @param id 사용자 ID
   */
  async remove(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    // 소프트 삭제 - 계정 비활성화
    return await this.updateActiveStatus(id, false);
  }
}
