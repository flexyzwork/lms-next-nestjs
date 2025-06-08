import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@packages/common';
import { Public } from '@packages/common';

// Zod 스키마 import
import {
  updateUserSchema,
  updateProfileSchema,
  updateSettingsSchema,
  userSearchQuerySchema,
  deleteAccountSchema,
  type UpdateUserDto,
  type UpdateProfileDto,
  type UpdateSettingsDto,
  type UserSearchQuery,
  type DeleteAccountDto,
  transformUserResponse,
  createUserFilter,
  createUserOrderBy,
} from './schemas/user.schema';

// 기본 스키마
import { paginationSchema } from '@packages/common';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * 데이터베이스 상태 확인 (인증 불필요 - 디버깅용)
   */
  @Get('debug/count')
  @Public()
  async getUserCount() {
    try {
      const count = await this.usersService.getUserCount();
      return {
        success: true,
        message: `데이터베이스에 사용자 ${count}명이 있습니다`,
        data: { count },
      };
    } catch (error) {
      this.logger.error(`사용자 수 확인 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 인증 없이 사용자 목록 조회 (디버깅용)
   */
  @Get('debug/list')
  @Public()
  async getUsersDebug() {
    try {
      this.logger.debug('디버그 모드: 인증 없이 사용자 목록 조회');

      const result = await this.usersService.findMany({
        filter: {},
        orderBy: { createdAt: 'desc' },
        page: 1,
        limit: 10,
      });

      this.logger.debug(`디버그 조회 결과: 사용자 ${result.users.length}명, 전체 ${result.pagination.totalItems}명`);

      return {
        success: true,
        message: '디버그 모드: 사용자 목록 조회 성공',
        data: result,
      };
    } catch (error) {
      this.logger.error(`디버그 사용자 목록 조회 실패: ${error.message}`);
      this.logger.error(`오류 스택: ${error.stack}`);
      throw error;
    }
  }

  /**
   * 인증된 사용자로 디버깅 (인증 필요)
   */
  @Get('debug/authenticated-list')
  @UseGuards(JwtAuthGuard)
  async getAuthenticatedUsersDebug(@CurrentUser('userId') userId: string) {
    try {
      this.logger.debug(`인증된 사용자 ID: ${userId}`);
      this.logger.debug('인증된 상태로 사용자 목록 조회 시도');

      const result = await this.usersService.findMany({
        filter: {},
        orderBy: { createdAt: 'desc' },
        page: 1,
        limit: 10,
      });

      this.logger.debug(`인증된 조회 결과: 사용자 ${result.users.length}명, 전체 ${result.pagination.totalItems}명`);

      return {
        success: true,
        message: '인증된 상태로 사용자 목록 조회 성공',
        data: {
          currentUserId: userId,
          ...result,
        },
      };
    } catch (error) {
      this.logger.error(`인증된 사용자 목록 조회 실패: ${error.message}`);
      this.logger.error(`오류 스택: ${error.stack}`);
      throw error;
    }
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser('userId') userId: string) {
    try {
      this.logger.debug(`사용자 ID: ${userId}, 타입: ${typeof userId}`);

      // 사용자 ID가 있는지 확인
      if (!userId) {
        throw new NotFoundException('사용자 ID를 찾을 수 없습니다');
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다');
      }

      return {
        success: true,
        data: transformUserResponse(user),
      };
    } catch (error) {
      this.logger.error(`사용자 정보 조회 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 사용자 정보 업데이트
   */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(
    @CurrentUser('userId') userId: string,
    @Body() updateUserDto: any, // 임시로 any 사용
  ) {
    try {
      this.logger.debug(`업데이트 데이터: ${JSON.stringify(updateUserDto)}`);

      if (!userId) {
        throw new NotFoundException('사용자 ID를 찾을 수 없습니다');
      }

      // 빈 객체인 경우 사용자 정보만 반환
      if (!updateUserDto || Object.keys(updateUserDto).length === 0) {
        const user = await this.usersService.findById(userId);
        return {
          success: true,
          message: '변경사항이 없습니다',
          data: transformUserResponse(user),
        };
      }

      // Zod 검증
      const validatedData = updateUserSchema.parse(updateUserDto);

      const user = await this.usersService.update(userId, validatedData);

      return {
        success: true,
        message: '사용자 정보가 업데이트되었습니다',
        data: transformUserResponse(user),
      };
    } catch (error) {
      this.logger.error(`사용자 정보 업데이트 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 사용자 프로필 업데이트
   */
  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateProfileDto: any, // 임시로 any 사용
  ) {
    try {
      this.logger.debug(`프로필 업데이트 데이터: ${JSON.stringify(updateProfileDto)}`);

      if (!userId) {
        throw new NotFoundException('사용자 ID를 찾을 수 없습니다');
      }

      // 빈 객체인 경우 기존 프로필 반환
      if (!updateProfileDto || Object.keys(updateProfileDto).length === 0) {
        const user = await this.usersService.findById(userId);
        return {
          success: true,
          message: '변경사항이 없습니다',
          data: user?.profile || {},
        };
      }

      // Zod 검증
      const validatedData = updateProfileSchema.parse(updateProfileDto);

      const profile = await this.usersService.updateProfile(userId, validatedData);

      return {
        success: true,
        message: '프로필이 업데이트되었습니다',
        data: profile,
      };
    } catch (error) {
      this.logger.error(`프로필 업데이트 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 사용자 설정 업데이트
   */
  @Put('me/settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @CurrentUser('userId') userId: string,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    try {
      this.logger.debug(`설정 업데이트 데이터: ${JSON.stringify(updateSettingsDto)}`);
      this.logger.debug(`사용자 ID: ${userId}`);

      if (!userId) {
        throw new NotFoundException('사용자 ID를 찾을 수 없습니다');
      }

      // 빈 객체인 경우 기존 설정 반환
      if (!updateSettingsDto || Object.keys(updateSettingsDto).length === 0) {
        const user = await this.usersService.findById(userId);
        return {
          success: true,
          message: '변경사항이 없습니다',
          data: user?.settings || {},
        };
      }

      // Zod 검증
      const validatedData = updateSettingsSchema.parse(updateSettingsDto);
      this.logger.debug(`검증된 데이터: ${JSON.stringify(validatedData)}`);

      const settings = await this.usersService.updateSettings(userId, validatedData);

      return {
        success: true,
        message: '설정이 업데이트되었습니다',
        data: settings,
      };
    } catch (error) {
      this.logger.error(`설정 업데이트 실패: ${error.message}`);
      this.logger.error(`오류 스택: ${error.stack}`);
      throw error;
    }
  }

  /**
   * 계정 삭제 (소프트 삭제)
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser('userId') userId: string,
    @Body() deleteDto: any, // 임시로 any 사용
  ) {
    try {
      this.logger.debug(`계정 삭제 데이터: ${JSON.stringify(deleteDto)}`);

      if (!userId) {
        throw new NotFoundException('사용자 ID를 찾을 수 없습니다');
      }

      // Zod 검증 (실제 사용 시)
      // const validatedData = deleteAccountSchema.parse(deleteDto);

      // TODO: 계정 삭제 로직 구현 (비밀번호 확인 포함)
      // await this.usersService.deleteAccount(userId, validatedData);

      return {
        success: true,
        message: '계정 삭제 기능은 아직 구현되지 않았습니다',
      };
    } catch (error) {
      this.logger.error(`계정 삭제 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 특정 사용자 조회 (관리자용)
   */
  // @Get(':id')
  // @UseGuards(JwtAuthGuard)
  // async getUserById(@Param('id') id: string) {
  //   try {
  //     const validatedId = uuidSchema.parse(id);

  //     const user = await this.usersService.findById(validatedId);
  //     if (!user) {
  //       throw new NotFoundException('사용자를 찾을 수 없습니다');
  //     }

  //     return {
  //       success: true,
  //       data: transformUserResponse(user),
  //     };
  //   } catch (error) {
  //     this.logger.error(`사용자 조회 실패: ${error.message}`);
  //     throw error;
  //   }
  // }

  /**
   * 사용자 목록 조회 (관리자용)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getUsers(@Query() rawQuery: any, @CurrentUser('userId') userId: string) {
    try {
      this.logger.debug(`=== 사용자 목록 조회 API 시작 ===`);
      this.logger.debug(`요청자 ID: ${userId}`);
      this.logger.debug(`요청 쿼리: ${JSON.stringify(rawQuery)}`);

      // 쿼리 파라미터 검증
      const query = userSearchQuerySchema.parse(rawQuery);
      this.logger.debug(`검증된 쿼리: ${JSON.stringify(query)}`);

      const filter = createUserFilter(query);
      const orderBy = createUserOrderBy(query);

      this.logger.debug(`생성된 필터: ${JSON.stringify(filter)}`);
      this.logger.debug(`생성된 정렬: ${JSON.stringify(orderBy)}`);

      this.logger.debug(`서비스 findMany 메서드 호출 전...`);

      // 실제 사용자 목록 조회
      const result = await this.usersService.findMany({
        filter,
        orderBy,
        page: query.page,
        limit: query.limit,
      });

      this.logger.debug(`서비스 findMany 메서드 호출 완료`);
      this.logger.debug(`최종 조회 결과: 사용자 ${result.users.length}명, 전체 ${result.pagination.totalItems}명`);

      const response = {
        success: true,
        data: result,
      };

      this.logger.debug(`반환 데이터 크기: ${JSON.stringify(response).length} bytes`);
      this.logger.debug(`=== 사용자 목록 조회 API 완료 ===`);

      return response;
    } catch (error) {
      this.logger.error(`사용자 목록 조회 실패: ${error.message}`);
      this.logger.error(`오류 스택: ${error.stack}`);
      throw error;
    }
  }
}
