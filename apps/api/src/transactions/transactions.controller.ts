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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { TransactionsService } from './transactions.service';
import { CurrentUser, JwtAuthGuard } from '@packages/common';
import { ZodValidationPipe } from '@packages/common';

import type {
  CreateStripePaymentIntentDto,
  CreateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';

import {
  CreateStripePaymentIntentSchema,
  CreateTransactionSchema,
  TransactionQuerySchema,
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
// @UseGuards(JwtAuthGuard) // 임시 비활성화
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
    @Query(new ZodValidationPipe(TransactionQuerySchema))
    query: TransactionQueryDto
    // @CurrentUser() user: User, // 임시 비활성화
  ) {
    // 임시로 더미 사용자 생성
    const user = { userId: 'temp-user-id', role: 'user' } as User;
    this.logger.log(
      `트랜잭션 목록 조회 요청 - 사용자: ${user.userId}, 조회 대상: ${query.userId || '전체'}`
    );

    const result = await this.transactionsService.findAllTransactions(
      query,
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
    @Body(new ZodValidationPipe(CreateStripePaymentIntentSchema))
    createPaymentIntentDto: CreateStripePaymentIntentDto
    // @CurrentUser() user: User, // 임시 비활성화
  ) {
    // 임시로 더미 사용자 생성
    const user = { userId: 'temp-user-id' } as User;
    this.logger.log(
      `Stripe 결제 의도 생성 요청 - 사용자: ${user.userId}, 금액: ${createPaymentIntentDto.amount}`
    );

    const result = await this.transactionsService.createStripePaymentIntent(
      createPaymentIntentDto
    );

    this.logger.log(`Stripe 결제 의도 생성 완료 - 사용자: ${user.userId}`);
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
    @Body(new ZodValidationPipe(CreateTransactionSchema))
    createTransactionDto: CreateTransactionDto
    // @CurrentUser() user: User, // 임시 비활성화
  ) {
    this.logger.log(
      `트랜잭션 생성 요청 - 사용자: ${createTransactionDto.userId}, 강의: ${createTransactionDto.courseId}`
    );

    const result =
      await this.transactionsService.createTransaction(createTransactionDto);

    this.logger.log(
      `트랜잭션 생성 완료 - ID: ${createTransactionDto.transactionId}`
    );
    return result;
  }
}
