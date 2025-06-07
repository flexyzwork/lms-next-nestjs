import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaModule } from '@packages/database';

/**
 * 💳 결제 및 트랜잭션 관리 모듈
 * 
 * 기능:
 * - Stripe 결제 처리
 * - 트랜잭션 생성 및 조회
 * - 강의 등록 및 학습 진도 초기화
 * - Zod 기반 데이터 검증
 */
@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
