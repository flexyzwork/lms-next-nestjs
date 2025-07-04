import { Controller, Get, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AppService } from './app.service';
import { Public } from '@packages/common';

/**
 * 🏠 API 메인 컨트롤러
 *
 * 주요 엔드포인트:
 * - GET / - API 상태 확인
 * - GET /health - 헬스체크
 */
@ApiTags('시스템')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  /**
   * 🏠 API 메인 페이지
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'API 메인 페이지', description: 'API 서버의 기본 정보를 반환합니다.' })
  @ApiResponse({ status: 200, description: 'API 정보 반환 성공' })
  getHello() {
    this.logger.log('API 메인 페이지 요청');
    return this.appService.getApiInfo();
  }

  /**
   * ❤️ 헬스체크 엔드포인트
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: '헬스체크', description: 'API 서버의 상태를 확인합니다.' })
  @ApiResponse({ status: 200, description: '서버 정상 상태' })
  getHealth() {
    this.logger.log('헬스체크 요청');
    return this.appService.getHealthCheck();
  }

  /**
   * 🎨 Favicon 처리
   */
  @Public()
  @Get('favicon.ico')
  @ApiOperation({ summary: 'Favicon', description: 'Favicon 파일을 반환합니다.' })
  @ApiResponse({ status: 204, description: 'Favicon 없음' })
  getFavicon(@Res() res: Response) {
    this.logger.log('Favicon 요청');
    // 204 No Content 응답으로 favicon 요청 처리
    res.status(204).end();
  }
}
