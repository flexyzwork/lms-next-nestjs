import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
  BadRequestException, // 새로 추가
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { TransactionsService } from './transactions.service';
import { ZodValidationPipe } from '@packages/common';

// 로컬 가드와 데코레이터 사용
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type {
  // CreateStripePaymentIntentDto, // 임시로 비활성화
  // CreateTransactionDto, // 임시로 비활성화
  // TransactionQueryDto, // 임시로 비활성화
} from './dto/transaction.dto';

import {
  // CreateStripePaymentIntentSchema, // 임시로 비활성화
  // CreateTransactionSchema, // 임시로 비활성화
  // TransactionQuerySchema, // 임시로 비활성화
} from './dto/transaction.dto';

import type { User } from '@packages/common';

/**
 * 💳 결제 및 트랜잭션 관리 컨트롤러
 *
 * 엔드포인트:
 * - GET /transactions - 트랜잭션 목록 조회 (인증 필요)
 * - POST /transactions - 새 트랜잭션 생성 (인증 필요)
 * - POST /transactions/stripe/payment-intent - Stripe 결제 의도 생성 (인증 필요)
 */
@ApiTags('결제 및 트랜잭션')
@Controller('transactions')
@UseGuards(ApiJwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * 📋 트랜잭션 목록 조회 (인증 필요)
   * 사용자별, 페이지네이션 지원
   */
  @Get()
  @ApiOperation({
    summary: '트랜잭션 목록 조회',
    description:
      '사용자의 결제 내역을 조회합니다. 관리자는 모든 트랜잭션을 조회할 수 있습니다.',
  })
  @ApiResponse({ status: 200, description: '트랜잭션 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 분당 20회 제한
  async listTransactions(
    @Query() query: any,
    @CurrentUser() user: User
  ) {
    // 수동으로 쿼리 파라미터 추출 및 검증
    const queryParams = {
      userId: query?.userId || undefined,
      courseId: query?.courseId || undefined,
      paymentProvider: query?.paymentProvider || undefined,
      page: query?.page ? parseInt(query.page) : 1,
      limit: query?.limit ? parseInt(query.limit) : 10,
      sortBy: query?.sortBy || 'dateTime',
      sortOrder: query?.sortOrder || 'desc'
    };
    
    this.logger.log(
      `트랜잭션 목록 조회 요청 - 사용자: ${user.id}, 조회 대상: ${queryParams.userId || '전체'}`
    );

    const result = await this.transactionsService.findAllTransactions(
      queryParams,
      user
    );

    this.logger.log(
      `트랜잭션 목록 조회 완료 - ${result.data.length}개 트랜잭션 반환`
    );
    return result;
  }

  /**
   * 💳 Stripe 결제 의도 생성 (인증 필요)
   * 클라이언트에서 결제를 진행하기 위한 client_secret 반환
   */
  @Post('stripe/payment-intent')
  @ApiOperation({
    summary: 'Stripe 결제 의도 생성',
    description:
      '결제를 위한 Stripe Payment Intent를 생성하고 client_secret을 반환합니다.',
  })
  @ApiResponse({ status: 201, description: '결제 의도 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 분당 10회 제한
  async createStripePaymentIntent(
    @Body() createPaymentIntentDto: any, // 임시로 직접 처리
    @CurrentUser() user: User
  ) {
    // 수동으로 데이터 검증
    const processedData = {
      amount: createPaymentIntentDto?.amount ? Number(createPaymentIntentDto.amount) : 0,
      courseId: createPaymentIntentDto?.courseId || '',
      currency: createPaymentIntentDto?.currency || 'krw',
      metadata: createPaymentIntentDto?.metadata || {}
    };
    
    if (!processedData.amount || processedData.amount <= 0) {
      throw new BadRequestException('결제 금액이 유효하지 않습니다');
    }
    
    this.logger.log(
      `Stripe 결제 의도 생성 요청 - 사용자: ${user.id}, 금액: ${processedData.amount}`
    );

    const result = await this.transactionsService.createStripePaymentIntent(
      processedData
    );

    this.logger.log(`Stripe 결제 의도 생성 완료 - 사용자: ${user.id}`);
    return result;
  }

  /**
   * 📝 새 트랜잭션 생성 (인증 필요)
   * 결제 성공 후 트랜잭션 기록, 강의 등록, 학습 진도 초기화
   */
  @Post()
  @ApiOperation({
    summary: '트랜잭션 생성',
    description: '결제 완료 후 트랜잭션을 기록하고 강의에 등록합니다.',
  })
  @ApiResponse({ status: 201, description: '트랜잭션 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '강의를 찾을 수 없음' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 분당 5회 제한 (결제는 제한적)
  async createTransaction(
    @Body() createTransactionDto: any, // 임시로 직접 처리
    @CurrentUser() user: User
  ) {
    // 수동으로 데이터 검증
    const processedData = {
      userId: createTransactionDto?.userId || '',
      courseId: createTransactionDto?.courseId || '',
      transactionId: createTransactionDto?.transactionId || '',
      amount: createTransactionDto?.amount ? Number(createTransactionDto.amount) : 0,
      paymentProvider: createTransactionDto?.paymentProvider || 'stripe',
      paymentMethodId: createTransactionDto?.paymentMethodId || undefined,
      description: createTransactionDto?.description || undefined
    };
    
    if (!processedData.userId || !processedData.courseId || !processedData.transactionId) {
      throw new BadRequestException('필수 필드가 누락되었습니다');
    }
    
    this.logger.log(
      `트랜잭션 생성 요청 - 사용자: ${processedData.userId}, 강의: ${processedData.courseId}, 요청자: ${user.id}`
    );

    const result =
      await this.transactionsService.createTransaction(processedData);

    this.logger.log(
      `트랜잭션 생성 완료 - ID: ${processedData.transactionId}`
    );
    return result;
  }
}
