import Stripe from "stripe";
import dotenv from "dotenv";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

dotenv.config();


if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required but was not found in env variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();
const prismaTx = prisma.transaction;
/**
 * 🔹 사용자의 트랜잭션(결제 내역) 조회
 */
export const listTransactions = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.query;

  try {
    const transactions = userId
      ? await prismaTx.findMany({
          where: { userId: String(userId) },
          include: { course: true },
        })
      : await prismaTx.findMany({ include: { course: true } });

    res.json({ message: "Transactions retrieved successfully", data: transactions });
  } catch (error) {
    console.error("❌ Error retrieving transactions:", error);
    res.status(500).json({ message: "Error retrieving transactions", error });
  }
};

/**
 * 🔹 Stripe 결제 요청 (클라이언트용)
 */
export const createStripePaymentIntent = async (req: Request, res: Response): Promise<void> => {
  let { amount } = req.body;

  if (!amount || amount <= 0) {
    amount = 50;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    res.json({ message: "Payment intent created", data: { clientSecret: paymentIntent.client_secret } });
  } catch (error) {
    console.error("❌ Error creating Stripe payment intent:", error);
    res.status(500).json({ message: "Error creating stripe payment intent", error });
  }
};

/**
 * 🔹 트랜잭션 생성 (결제 성공 시 실행)
 */
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  const { userId, courseId, transactionId, amount, paymentProvider } = req.body;

  try {
    const course = await prisma.course.findUnique({
      where: { courseId },
      include: { sections: { include: { chapters: true } } },
    });

    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    // 🔥 Prisma 트랜잭션으로 데이터 일괄 저장 (원자적 처리)
    const createdTransaction = await prisma.$transaction(async (tx) => {
      // 1️⃣ 트랜잭션 기록 추가
      const newTransaction = await tx.transaction.create({
        data: {
          transactionId,
          userId,
          courseId,
          amount,
          paymentProvider,
          dateTime: new Date(),
        },
      });

      // 2️⃣ 학습 진행 기록 추가
      const newProgress = await tx.userCourseProgress.create({
        data: {
          userId,
          courseId,
          enrollmentDate: new Date(),
          overallProgress: 0,
          lastAccessedTimestamp: new Date(),
          sections: JSON.stringify(
            course.sections.map((section) => ({
              sectionId: section.sectionId,
              chapters: section.chapters.map((chapter) => ({
                chapterId: chapter.chapterId,
                completed: false,
              })),
            }))
          ),
        },
      });

      // 3️⃣ 수강 기록 추가 (Enrollment)
      await tx.enrollment.create({
        data: {
          userId,
          courseId,
          enrolledAt: new Date(),
        },
      });

      return { transaction: newTransaction, progress: newProgress };
    });

    res.json({ message: "Purchased Course successfully", data: createdTransaction });
  } catch (error) {
    console.error("❌ Error creating transaction and enrollment:", error);
    res.status(500).json({ message: "Error creating transaction and enrollment", error });
  }
};
