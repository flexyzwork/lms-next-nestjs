import { Controller, Get, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  generateId,
  isValidCuid2,
  detectIdType,
  // migrateToNewId
} from '@packages/common';

/**
 * 🔧 ID 디버깅 및 테스트 컨트롤러
 * 개발 환경에서만 사용 (프로덕션에서는 제거)
 */
@ApiTags('ID 디버깅 (개발용)')
@Controller('debug/ids')
export class IdDebugController {
  private readonly logger = new Logger(IdDebugController.name);

  /**
   * 새로운 CUID2 ID 생성 테스트
   */
  @Get('generate')
  @ApiOperation({
    summary: 'CUID2 ID 생성 (기본 5개)',
    description: '기본적으로 5개의 새로운 CUID2 ID를 생성합니다.',
  })
  @ApiResponse({ status: 200, description: 'ID 생성 성공' })
  generateDefaultIds() {
    return this.generateIdsWithCount('5');
  }

  /**
   * 지정된 개수의 CUID2 ID 생성
   */
  @Get('generate/:count')
  @ApiOperation({
    summary: 'CUID2 ID 생성 (개수 지정)',
    description: '지정된 개수만큼 새로운 CUID2 ID를 생성합니다.',
  })
  @ApiResponse({ status: 200, description: 'ID 생성 성공' })
  generateCountIds(@Param('count') count: string) {
    return this.generateIdsWithCount(count);
  }

  private generateIdsWithCount(count: string) {
    const numIds = count ? parseInt(count, 10) : 5;
    const maxIds = Math.min(numIds, 20); // 최대 20개로 제한

    const ids = [];
    const stats = {
      totalGenerated: 0,
      validCount: 0,
      invalidCount: 0,
      lengthStats: {} as Record<number, number>
    };

    for (let i = 0; i < maxIds; i++) {
      try {
        const id = generateId();
        const isValid = isValidCuid2(id);

        ids.push({
          id,
          length: id.length,
          valid: isValid,
          index: i + 1
        });

        stats.totalGenerated++;
        if (isValid) {
          stats.validCount++;
        } else {
          stats.invalidCount++;
        }

        // 길이별 통계
        stats.lengthStats[id.length] = (stats.lengthStats[id.length] || 0) + 1;

      } catch (error) {
        this.logger.error(`ID 생성 실패 (${i + 1}번째):`, error);
        ids.push({
          id: null,
          length: 0,
          valid: false,
          error: error.message,
          index: i + 1
        });
        stats.invalidCount++;
      }
    }

    return {
      success: true,
      message: `${maxIds}개의 CUID2 ID를 생성했습니다`,
      data: {
        ids,
        statistics: {
          ...stats,
          successRate: `${((stats.validCount / stats.totalGenerated) * 100).toFixed(1)}%`,
          expectedLength: 24,
          allCorrectLength: Object.keys(stats.lengthStats).length === 1 &&
                           Object.keys(stats.lengthStats)[0] === '24'
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ID 형식 검증 및 분석
   */
  @Get('analyze/:id')
  @ApiOperation({
    summary: 'ID 형식 분석',
    description: '제공된 ID의 형식을 분석하고 검증합니다.',
  })
  @ApiResponse({ status: 200, description: 'ID 분석 완료' })
  analyzeId(@Param('id') id: string) {
    this.logger.log(`ID 분석 요청: ${id}`);

    try {
      const detection = detectIdType(id);
      const isValidCuid2Result = isValidCuid2(id);

      // 마이그레이션 정보
      // const migration = migrateToNewId(id);

      // 상세 분석
      const analysis = {
        inputId: id,
        length: id.length,
        expectedLength: 24,
        lengthMatch: id.length === 24,

        // 문자 구성 분석
        characterAnalysis: {
          firstChar: id.charAt(0),
          firstCharIsLowercase: /^[a-z]$/.test(id.charAt(0)),
          remainingChars: id.slice(1),
          remainingCharsValid: /^[a-z0-9]+$/.test(id.slice(1)),
          hasUppercase: /[A-Z]/.test(id),
          hasSpecialChars: /[^a-z0-9]/.test(id)
        },

        // 검증 결과
        validation: {
          isValidCuid2: isValidCuid2Result,
          detectedType: detection.type,
          detectionMessage: detection.message,
          detectionValid: detection.valid
        },

        // 마이그레이션 정보
        // migration: {
        //   required: migration.migrationRequired,
        //   reason: migration.reason,
        //   newId: migration.migrationRequired ? migration.newId : null,
        //   oldId: migration.oldId
        // }
      };

      return {
        success: true,
        message: `ID 분석이 완료되었습니다: ${detection.message}`,
        data: analysis,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('ID 분석 중 오류:', error);
      return {
        success: false,
        error: {
          message: 'ID 분석 중 오류가 발생했습니다',
          details: error.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 레거시 ID 마이그레이션 도우미
   */
  // @Get('migrate/:legacyId')
  // @ApiOperation({
  //   summary: '레거시 ID 마이그레이션',
  //   description: '레거시 ID를 새로운 CUID2로 변환합니다.',
  // })
  // @ApiResponse({ status: 200, description: '마이그레이션 완료' })
  // migrateLegacyId(@Param('legacyId') legacyId: string) {
  //   this.logger.log(`레거시 ID 마이그레이션 요청: ${legacyId}`);

  //   try {
  //     // const result = migrateToNewId(legacyId);

  //     return {
  //       success: true,
  //       message: result.migrationRequired
  //         ? '새로운 CUID2 ID로 마이그레이션되었습니다'
  //         : '이미 유효한 CUID2 ID입니다',
  //       data: {
  //         ...result,
  //         recommendation: result.migrationRequired
  //           ? `데이터베이스에서 "${result.oldId}"를 "${result.newId}"로 업데이트하세요`
  //           : '마이그레이션이 필요하지 않습니다'
  //       },
  //       timestamp: new Date().toISOString()
  //     };

  //   } catch (error) {
  //     this.logger.error('마이그레이션 중 오류:', error);
  //     return {
  //       success: false,
  //       error: {
  //         message: '마이그레이션 중 오류가 발생했습니다',
  //         details: error.message
  //       },
  //       timestamp: new Date().toISOString()
  //     };
  //   }
  // }
}
