// ==============================
// 💳 거래(결제) 관련 통합 스키마
// API 서비스와 웹 클라이언트에서 공통으로 사용
// ==============================

import { z } from 'zod';
import {
  paginationSchema,
  sortOrderSchema,
  idSchema,
  dateRangeSchema,
} from '../base';

// ===================================
// 💰 결제 관련 Enum 정의
// ===================================

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  KAKAO_PAY = 'kakao_pay',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  KAKAO_PAY = 'kakao_pay',
  PAYPAL = 'paypal',
}

// ===================================
// 🔍 기본 거래 스키마들
// ===================================

// Stripe Payment Intent 생성 스키마
export const createStripePaymentIntentSchema = z
  .object({
    courseId: idSchema,
    amount: z
      .number()
      .int()
      .min(100, '최소 결제 금액은 100원입니다')
      .max(10000000, '최대 결제 금액은 1,000만원입니다'),
    currency: z.string().default('krw'),
    paymentMethodId: z.string().optional(),
    savePaymentMethod: z.boolean().default(false),
  })
  .strict();

// 거래 생성 스키마
export const createTransactionSchema = z
  .object({
    userId: idSchema,
    courseId: idSchema,
    amount: z
      .number()
      .int()
      .min(100, '최소 결제 금액은 100원입니다')
      .max(10000000, '최대 결제 금액은 1,000만원입니다'),
    currency: z.string().default('krw'),
    paymentProvider: z.nativeEnum(PaymentProvider),
    paymentMethodId: z.string().optional(),
    paymentIntentId: z.string().optional(), // Stripe용
    status: z.nativeEnum(PaymentStatus).default(PaymentStatus.PENDING),
    metadata: z.record(z.string()).optional(), // 추가 메타데이터
  })
  .strict();

// 거래 업데이트 스키마
export const updateTransactionSchema = z
  .object({
    status: z.nativeEnum(PaymentStatus).optional(),
    paymentMethodId: z.string().optional(),
    completedAt: z.string().datetime().optional(),
    failureReason: z
      .string()
      .max(500, '실패 사유는 500자를 초과할 수 없습니다')
      .optional(),
    metadata: z.record(z.string()).optional(),
  })
  .strict();

// 거래 검색 쿼리 스키마
export const transactionQuerySchema = paginationSchema
  .extend({
    userId: idSchema.optional(),
    courseId: idSchema.optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    paymentProvider: z.nativeEnum(PaymentProvider).optional(),
    minAmount: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(
        z.number().int().min(0, '최소 금액은 0 이상이어야 합니다').optional()
      ),
    maxAmount: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(
        z.number().int().min(0, '최대 금액은 0 이상이어야 합니다').optional()
      ),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'amount', 'status'])
      .default('createdAt'),
    sortOrder: sortOrderSchema,
  })
  .strict();

// 환불 요청 스키마
export const refundRequestSchema = z
  .object({
    transactionId: idSchema,
    reason: z
      .string()
      .min(1, '환불 사유는 필수입니다')
      .max(500, '환불 사유는 500자를 초과할 수 없습니다'),
    amount: z
      .number()
      .int()
      .min(100, '환불 금액은 100원 이상이어야 합니다')
      .optional(), // 부분 환불용
  })
  .strict();

// 결제 수단 저장 스키마
export const savePaymentMethodSchema = z
  .object({
    userId: idSchema,
    paymentMethodId: z.string().min(1, '결제 수단 ID는 필수입니다'),
    type: z.nativeEnum(PaymentMethod),
    isDefault: z.boolean().default(false),
    metadata: z
      .object({
        lastFour: z.string().optional(), // 카드 마지막 4자리
        brand: z.string().optional(), // 카드 브랜드 (visa, mastercard 등)
        expiry: z.string().optional(), // 만료일 (MM/YY)
      })
      .optional(),
  })
  .strict();

// 웹훅 검증 스키마
export const webhookEventSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    provider: z.nativeEnum(PaymentProvider),
    data: z.record(z.any()),
    created: z.number(),
  })
  .strict();

// ===================================
// 📝 TypeScript 타입 추출
// ===================================

export type CreateStripePaymentIntentDto = z.infer<
  typeof createStripePaymentIntentSchema
>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
export type TransactionQueryDto = z.infer<typeof transactionQuerySchema>;
export type RefundRequestDto = z.infer<typeof refundRequestSchema>;
export type SavePaymentMethodDto = z.infer<typeof savePaymentMethodSchema>;
export type WebhookEventDto = z.infer<typeof webhookEventSchema>;

// ===================================
// 🏗️ 인터페이스 정의
// ===================================

// 완전한 거래 정보 인터페이스
export interface Transaction {
  transactionId: string;
  userId: string;
  courseId: string;
  amount: number; // 원 단위
  currency: string;
  paymentProvider: PaymentProvider;
  paymentMethodId?: string;
  paymentIntentId?: string;
  status: PaymentStatus;
  completedAt?: string;
  failureReason?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;

  // 관계형 데이터
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  course?: {
    courseId: string;
    title: string;
    price?: number;
    teacherId: string;
  };
  refunds?: Refund[];
}

// 환불 정보 인터페이스
export interface Refund {
  refundId: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 저장된 결제 수단 인터페이스
export interface SavedPaymentMethod {
  id: string;
  userId: string;
  paymentMethodId: string;
  type: PaymentMethod;
  isDefault: boolean;
  metadata?: {
    lastFour?: string;
    brand?: string;
    expiry?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 거래 통계 인터페이스
export interface TransactionStats {
  totalTransactions: number;
  completedTransactions: number;
  totalRevenue: number; // 원 단위
  averageTransactionAmount: number;
  refundRate: number; // 백분율
  popularPaymentMethods: Array<{
    method: PaymentProvider;
    count: number;
    percentage: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    transactionCount: number;
  }>;
}

// 날짜 범위 인터페이스
export interface DateRange {
  from: string | undefined;
  to: string | undefined;
}

// ===================================
// 🔧 유틸리티 함수들
// ===================================

// 거래 필터 생성 함수
export function createTransactionFilter(query: TransactionQueryDto) {
  const filter: any = {};

  // 사용자 ID 필터
  if (query.userId) {
    filter.userId = query.userId;
  }

  // 강의 ID 필터
  if (query.courseId) {
    filter.courseId = query.courseId;
  }

  // 상태 필터
  if (query.status) {
    filter.status = query.status;
  }

  // 결제 제공자 필터
  if (query.paymentProvider) {
    filter.paymentProvider = query.paymentProvider;
  }

  // 금액 범위 필터
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {};
    if (query.minAmount !== undefined) {
      filter.amount.gte = query.minAmount;
    }
    if (query.maxAmount !== undefined) {
      filter.amount.lte = query.maxAmount;
    }
  }

  // 날짜 범위 필터
  if (query.createdAfter || query.createdBefore) {
    filter.createdAt = {};
    if (query.createdAfter) {
      filter.createdAt.gte = new Date(query.createdAfter);
    }
    if (query.createdBefore) {
      filter.createdAt.lte = new Date(query.createdBefore);
    }
  }

  return filter;
}

// 정렬 옵션 생성 함수
export function createTransactionOrderBy(query: TransactionQueryDto) {
  return {
    [query.sortBy]: query.sortOrder,
  };
}

// 거래 통계 계산 함수
export function calculateTransactionStats(
  transactions: Transaction[]
): TransactionStats {
  const total = transactions.length;
  const completed = transactions.filter(
    (t) => t.status === PaymentStatus.COMPLETED
  );
  const refunded = transactions.filter(
    (t) => t.status === PaymentStatus.REFUNDED
  );

  const totalRevenue = completed.reduce((sum, t) => sum + t.amount, 0);
  const averageAmount =
    completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;
  const refundRate =
    total > 0 ? Math.round((refunded.length / total) * 100) : 0;

  // 결제 수단별 통계
  const providerCount: Record<PaymentProvider, number> = {
    [PaymentProvider.STRIPE]: 0,
    [PaymentProvider.PAYPAL]: 0,
    [PaymentProvider.KAKAO_PAY]: 0,
  };

  transactions.forEach((t) => {
    providerCount[t.paymentProvider]++;
  });

  const popularPaymentMethods = Object.entries(providerCount)
    .map(([method, count]) => ({
      method: method as PaymentProvider,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 월별 수익 (최근 12개월)
  const monthlyData: Record<string, { revenue: number; count: number }> = {};
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = { revenue: 0, count: 0 };
  }

  completed.forEach((transaction) => {
    const date = new Date(transaction.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (monthlyData[monthKey]) {
      monthlyData[monthKey].revenue += transaction.amount;
      monthlyData[monthKey].count++;
    }
  });

  const monthlyRevenue = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    transactionCount: data.count,
  }));

  return {
    totalTransactions: total,
    completedTransactions: completed.length,
    totalRevenue,
    averageTransactionAmount: averageAmount,
    refundRate,
    popularPaymentMethods,
    monthlyRevenue,
  };
}

// 거래 검색 쿼리 검증 함수
export function validateTransactionQuery(query: any): TransactionQueryDto {
  const result = transactionQuerySchema.safeParse(query);
  if (!result.success) {
    throw new Error(
      `잘못된 거래 검색 쿼리: ${result.error.errors.map((e) => e.message).join(', ')}`
    );
  }
  return result.data;
}

// 거래 금액 포맷팅 함수
export function formatTransactionAmount(
  amount: number,
  currency: string = 'KRW'
): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

// 결제 상태 한국어 변환 함수
export function getPaymentStatusText(status: PaymentStatus): string {
  const statusMap = {
    [PaymentStatus.PENDING]: '대기 중',
    [PaymentStatus.COMPLETED]: '완료',
    [PaymentStatus.FAILED]: '실패',
    [PaymentStatus.CANCELLED]: '취소됨',
    [PaymentStatus.REFUNDED]: '환불됨',
  };

  return statusMap[status];
}

// 결제 제공자 한국어 변환 함수
export function getPaymentProviderText(provider: PaymentProvider): string {
  const providerMap = {
    [PaymentProvider.STRIPE]: '신용카드',
    [PaymentProvider.PAYPAL]: 'PayPal',
    [PaymentProvider.KAKAO_PAY]: '카카오페이',
  };

  return providerMap[provider];
}

// 결제 수단 타입 한국어 변환 함수
export function getPaymentMethodText(method: PaymentMethod): string {
  const methodMap = {
    [PaymentMethod.CARD]: '신용카드',
    [PaymentMethod.BANK_TRANSFER]: '계좌이체',
    [PaymentMethod.KAKAO_PAY]: '카카오페이',
    [PaymentMethod.PAYPAL]: 'PayPal',
  };

  return methodMap[method];
}

// 환불 가능 여부 확인 함수
export function canRefundTransaction(transaction: Transaction): boolean {
  // 완료된 거래만 환불 가능
  if (transaction.status !== PaymentStatus.COMPLETED) {
    return false;
  }

  // 30일 이내 거래만 환불 가능 (정책에 따라 조정 가능)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactionDate = new Date(transaction.createdAt);
  return transactionDate >= thirtyDaysAgo;
}

// 거래 검증 함수
export function validateTransaction(transaction: any): boolean {
  try {
    createTransactionSchema.parse(transaction);
    return true;
  } catch {
    return false;
  }
}
