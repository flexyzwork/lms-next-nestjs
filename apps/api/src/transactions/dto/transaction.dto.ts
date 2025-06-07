import {
  createStripePaymentIntentSchema,
  createTransactionSchema,
  transactionQuerySchema,
} from '@packages/common';

import type {
  CreateTransactionDto,
  TransactionQueryDto,
  CreateStripePaymentIntentDto,
} from '@packages/common';

// re-export 스키마들
export {
  createStripePaymentIntentSchema as CreateStripePaymentIntentSchema,
  createTransactionSchema as CreateTransactionSchema,
  transactionQuerySchema as TransactionQuerySchema,
};

// re-export 타입들
export type {
  CreateStripePaymentIntentDto,
  CreateTransactionDto,
  TransactionQueryDto,
};

// Enum 타입
export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  KAKAO_PAY = 'kakao_pay',
}
