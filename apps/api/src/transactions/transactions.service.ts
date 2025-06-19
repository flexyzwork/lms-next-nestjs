import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '@packages/database';
// import { CreateStripePaymentIntentDto, CreateTransactionDto } from './dto/transaction.dto';
// 임시로 비활성화: 모든 DTO 타입

import type { User } from '@packages/common';

/**
 * 💳 결제 및 트랜잭션 관리 서비스
 *
 * 주요 기능:
 * - Stripe 결제 처리
 * - 트랜잭션 생성 및 조회
 * - 강의 등록 및 학습 진도 초기화
 * - 결제 후 데이터 일관성 보장 (트랜잭션)
 */
@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly stripe: Stripe;

  constructor(private readonly prismaService: PrismaService) {
    // Stripe 초기화
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      this.logger.error('STRIPE_SECRET_KEY 환경변수가 설정되지 않음');
      throw new Error(
        'STRIPE_SECRET_KEY is required but was not found in env variables'
      );
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-05-28.basil',
    });
  }

  /**
   * 📋 트랜잭션 목록 조회 (사용자별, 페이지네이션)
   */
  async findAllTransactions(query: any, user: User) {
    try {
      this.logger.log(
        `트랜잭션 목록 조회 시작 - 요청자: ${user.id}, 대상: ${query.userId || '전체'}`
      );

      // 권한 검증: 일반 사용자는 자신의 트랜잭션만 조회 가능
      const isAdmin = user.role === 'admin' || user.role === 'teacher';

      // 일반 사용자가 다른 사용자의 트랜잭션을 조회하려 하는 경우
      if (!isAdmin && query.userId && query.userId !== user.id) {
        this.logger.warn(
          `권한 없음 - 요청자: ${user.id}, 대상: ${query.userId}`
        );
        throw new ForbiddenException('본인의 트랜잭션만 조회할 수 있습니다');
      }

      const targetUserId = isAdmin ? query.userId : user.id;
      const whereClause = targetUserId ? { userId: targetUserId } : {};

      // 페이지네이션 계산
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;

      const [transactions, totalCount] = await Promise.all([
        this.prismaService.transaction.findMany({
          where: whereClause,
          include: {
            course: {
              select: {
                courseId: true,
                title: true,
                teacherName: true,
                category: true,
                price: true,
              },
            },
          },
          orderBy: {
            dateTime: query.sortOrder === 'asc' ? 'asc' : 'desc',
          },
          take: limit,
          skip: offset,
        }),
        this.prismaService.transaction.count({
          where: whereClause,
        }),
      ]);

      this.logger.log(
        `트랜잭션 목록 조회 완료 - ${transactions.length}개 트랜잭션 반환 (전체: ${totalCount}개)`
      );

      return {
        message: '트랜잭션 목록 조회 성공',
        data: transactions,
        pagination: {
          total: totalCount,
          page,
          limit,
          offset,
          hasNext: offset + limit < totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      this.logger.error('트랜잭션 목록 조회 중 오류 발생', error);
      throw new BadRequestException(
        '트랜잭션 목록을 조회하는 중 오류가 발생했습니다'
      );
    }
  }

  /**
   * 💳 Stripe 결제 의도 생성
   *
   * 주의: KRW(한국 원화)는 센트 단위가 없으므로 원 단위 그대로 전달
   * USD, EUR 등의 통화는 센트 단위로 변환 필요
   */
  async createStripePaymentIntent(createPaymentIntentDto: any) {
    try {
      this.logger.log(
        `Stripe 결제 의도 생성 시작 - 금액: ${createPaymentIntentDto.amount}`
      );

      let { amount } = createPaymentIntentDto;

      // 최소 금액 검증
      if (!amount || amount <= 0) {
        this.logger.warn('잘못된 결제 금액, 기본값으로 설정');
        amount = 50; // 기본 50원
      }

      // 한국 원화(KRW)는 센트 단위가 없으므로 그대로 사용
      // 다른 통화(USD, EUR 등)의 경우에만 센트 변환 필요
      const amountForStripe = amount; // KRW는 원 단위 그대로 전달

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountForStripe, // KRW는 원 단위 그대로 사용
        currency: 'krw', // 한국 원화
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          originalAmount: amount.toString(),
          currency: 'KRW',
        },
      });

      this.logger.log(
        `Stripe 결제 의도 생성 완료 - ID: ${paymentIntent.id}, 금액: ${amount}원 (KRW 원 단위)`
      );

      return {
        message: 'Stripe 결제 의도 생성 성공',
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount,
          currency: 'KRW',
        },
      };
    } catch (error) {
      this.logger.error('Stripe 결제 의도 생성 중 오류 발생', error);

      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe 오류: ${error.message}`);
      }

      throw new BadRequestException(
        '결제 의도를 생성하는 중 오류가 발생했습니다'
      );
    }
  }

  /**
   * 📝 새 트랜잭션 생성 (결제 완료 후, N+1 최적화 적용)
   * 원자적 처리로 트랜잭션, 등록, 학습 진도 초기화를 모두 처리
   *
   * 🚀 성능 최적화:
   * - 필요한 데이터만 select로 조회
   * - findUniqueOrThrow로 에러 처리 간소화
   * - 트랜잭션 내에서 모든 작업 원자적 수행
   */
  async createTransaction(createTransactionDto: any) {
    try {
      this.logger.log(
        `트랜잭션 생성 시작 - 사용자: ${createTransactionDto.userId}, 강의: ${createTransactionDto.courseId}`
      );

      const { userId, courseId, transactionId, amount, paymentProvider } =
        createTransactionDto;

      // 🚀 N+1 최적화: 트랜잭션으로 원자적 처리
      const result = await this.prismaService.$transaction(async (tx) => {
        // 🚀 필요한 데이터만 선택적 조회
        const course = await tx.course.findUniqueOrThrow({
          where: { courseId },
          select: {
            courseId: true,
            title: true,
            teacherName: true,
            category: true,
            price: true,
            sections: {
              select: {
                sectionId: true,
                sectionTitle: true,
                chapters: {
                  select: {
                    chapterId: true,
                    title: true,
                  },
                  orderBy: {
                    createdAt: 'asc',
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });

        // 이미 등록된 사용자인지 확인
        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId,
              courseId,
            },
          },
        });

        if (existingEnrollment) {
          this.logger.warn(
            `이미 등록된 강의 - 사용자: ${userId}, 강의: ${courseId}`
          );
          throw new BadRequestException('이미 등록된 강의입니다');
        }

        // 1️⃣ 트랜잭션 기록 생성
        const newTransaction = await tx.transaction.create({
          data: {
            transactionId,
            userId,
            courseId,
            amount,
            paymentProvider,
            dateTime: new Date(),
          },
          select: {
            transactionId: true,
            userId: true,
            courseId: true,
            amount: true,
            paymentProvider: true,
            dateTime: true,
          },
        });

        // 2️⃣ 강의 등록 생성
        const newEnrollment = await tx.enrollment.create({
          data: {
            userId,
            courseId,
            enrolledAt: new Date(),
          },
        });

        // 3️⃣ 학습 진도 초기화 (최적화된 데이터 구조)
        const sectionsProgress = course.sections.map((section) => ({
          sectionId: section.sectionId,
          sectionTitle: section.sectionTitle,
          completed: false,
          chapters: section.chapters.map((chapter) => ({
            chapterId: chapter.chapterId,
            title: chapter.title,
            completed: false,
            watchedDuration: 0,
          })),
        }));

        const newProgress = await tx.userCourseProgress.create({
          data: {
            userId,
            courseId,
            enrollmentDate: new Date(),
            overallProgress: 0,
            lastAccessedTimestamp: new Date(),
            sections: JSON.stringify(sectionsProgress),
          },
        });

        // 📊 완전한 결과 데이터 구성
        return {
          transaction: {
            ...newTransaction,
            course: {
              courseId: course.courseId,
              title: course.title,
              teacherName: course.teacherName,
              category: course.category,
            },
          },
          enrollment: newEnrollment,
          progress: {
            ...newProgress,
            sections: sectionsProgress, // 파싱된 데이터
          },
          courseInfo: {
            title: course.title,
            sectionsCount: course.sections.length,
            chaptersCount: course.sections.reduce(
              (acc, section) => acc + section.chapters.length,
              0
            ),
          },
        };
      });

      this.logger.log(
        `트랜잭션 생성 완료 - ID: ${transactionId}, 강의: ${result.courseInfo.title}`
      );

      return {
        message: '강의 구매 및 등록 성공',
        data: result,
        optimized: true, // 최적화 적용 표시
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Prisma P2025 에러: 강의를 찾을 수 없음
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        this.logger.warn(
          `강의를 찾을 수 없음 - ID: ${createTransactionDto.courseId}`
        );
        throw new NotFoundException('강의를 찾을 수 없습니다');
      }

      this.logger.error('트랜잭션 생성 중 오류 발생', error);
      throw new BadRequestException(
        '트랜잭션을 생성하는 중 오류가 발생했습니다'
      );
    }
  }
}
