// ==============================
// 📈 사용자 강의 진도 관리 통합 스키마
// API 서비스와 웹 클라이언트에서 공통으로 사용
// ==============================

import { z } from 'zod';
import { paginationSchema, sortOrderSchema, idSchema } from '../base';

// ===================================
// 📊 진도 관련 기본 스키마들
// ===================================

// 챕터 진도 스키마
export const chapterProgressSchema = z
  .object({
    chapterId: idSchema,
    completed: z.boolean().default(false),
    completedAt: z.string().datetime().optional(),
    timeSpent: z.number().min(0, '소요 시간은 0 이상이어야 합니다').default(0), // 초 단위
    lastPosition: z
      .number()
      .min(0, '마지막 위치는 0 이상이어야 합니다')
      .default(0), // 비디오 재생 위치 등
  })
  .strict();

// 섹션 진도 스키마
export const sectionProgressSchema = z
  .object({
    sectionId: idSchema,
    chapters: z.array(chapterProgressSchema).default([]),
    completedChapters: z
      .number()
      .int()
      .min(0, '완료된 챕터 수는 0 이상이어야 합니다')
      .default(0),
    totalChapters: z
      .number()
      .int()
      .min(0, '전체 챕터 수는 0 이상이어야 합니다')
      .default(0),
    progressPercentage: z
      .number()
      .min(0)
      .max(100, '진도율은 0-100 사이여야 합니다')
      .default(0),
  })
  .strict();

// 사용자 강의 진도 업데이트 스키마
export const updateUserCourseProgressSchema = z
  .object({
    chapterId: idSchema,
    completed: z.boolean(),
    timeSpent: z.number().min(0, '소요 시간은 0 이상이어야 합니다').optional(),
    lastPosition: z
      .number()
      .min(0, '마지막 위치는 0 이상이어야 합니다')
      .optional(),
  })
  .strict();

// 진도 검색 쿼리 스키마
export const progressQuerySchema = paginationSchema
  .extend({
    userId: idSchema.optional(),
    courseId: idSchema.optional(),
    minProgress: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(
        z.number().min(0).max(100, '진도율은 0-100 사이여야 합니다').optional()
      ),
    maxProgress: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(
        z.number().min(0).max(100, '진도율은 0-100 사이여야 합니다').optional()
      ),
    completed: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => (val ? val === 'true' : undefined)),
    enrolledAfter: z.string().datetime().optional(),
    enrolledBefore: z.string().datetime().optional(),
    lastAccessAfter: z.string().datetime().optional(),
    lastAccessBefore: z.string().datetime().optional(),
    sortBy: z
      .enum([
        'enrollmentDate',
        'lastAccessedTimestamp',
        'overallProgress',
        'timeSpent',
      ])
      .default('lastAccessedTimestamp'),
    sortOrder: sortOrderSchema,
  })
  .strict();

// ===================================
// 📝 TypeScript 타입 추출
// ===================================

export type ChapterProgressDto = z.infer<typeof chapterProgressSchema>;
export type SectionProgressDto = z.infer<typeof sectionProgressSchema>;
export type UpdateUserCourseProgressDto = z.infer<
  typeof updateUserCourseProgressSchema
>;
export type ProgressQueryDto = z.infer<typeof progressQuerySchema>;

// ===================================
// 🏗️ 인터페이스 정의
// ===================================

// 챕터 진도 인터페이스
export interface ChapterProgress {
  chapterId: string;
  completed: boolean;
  completedAt?: string;
  timeSpent: number; // 초 단위
  lastPosition: number; // 비디오 재생 위치 등
}

// 섹션 진도 인터페이스
export interface SectionProgress {
  sectionId: string;
  chapters: ChapterProgress[];
  completedChapters: number;
  totalChapters: number;
  progressPercentage: number;
}

// 사용자 강의 진도 종합 인터페이스
export interface UserCourseProgress {
  userId: string;
  courseId: string;
  enrollmentDate: string;
  overallProgress: number; // 0-100 퍼센트
  sections: SectionProgress[];
  lastAccessedTimestamp: string;
  totalTimeSpent: number; // 초 단위
  completedAt?: string;
  certificateId?: string;

  // 계산된 필드들
  completedChapters?: number;
  totalChapters?: number;
  estimatedTimeRemaining?: number; // 초 단위
  averageTimePerChapter?: number; // 초 단위
}

// ===================================
// 🔧 유틸리티 함수들
// ===================================

// 전체 진도율 계산 함수
export function calculateOverallProgress(sections: SectionProgress[]): number {
  if (sections.length === 0) return 0;

  const totalChapters = sections.reduce(
    (sum, section) => sum + section.totalChapters,
    0
  );
  const completedChapters = sections.reduce(
    (sum, section) => sum + section.completedChapters,
    0
  );

  return totalChapters > 0
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;
}

// 섹션 진도율 계산 함수
export function calculateSectionProgress(chapters: ChapterProgress[]): number {
  if (chapters.length === 0) return 0;

  const completedChapters = chapters.filter(
    (chapter) => chapter.completed
  ).length;
  return Math.round((completedChapters / chapters.length) * 100);
}

// 학습 시간 포맷팅 함수
export function formatStudyTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else if (minutes > 0) {
    return `${minutes}분`;
  } else {
    return '1분 미만';
  }
}

// 진도 검색 필터 생성 함수
export function createProgressFilter(query: ProgressQueryDto) {
  const filter: any = {};

  if (query.userId) {
    filter.userId = query.userId;
  }

  if (query.courseId) {
    filter.courseId = query.courseId;
  }

  // 진도율 범위 필터
  if (query.minProgress !== undefined || query.maxProgress !== undefined) {
    filter.overallProgress = {};
    if (query.minProgress !== undefined) {
      filter.overallProgress.gte = query.minProgress;
    }
    if (query.maxProgress !== undefined) {
      filter.overallProgress.lte = query.maxProgress;
    }
  }

  // 완료 여부 필터
  if (query.completed !== undefined) {
    if (query.completed) {
      filter.overallProgress = { gte: 100 };
    } else {
      filter.overallProgress = { lt: 100 };
    }
  }

  // 등록 날짜 범위 필터
  if (query.enrolledAfter || query.enrolledBefore) {
    filter.enrollmentDate = {};
    if (query.enrolledAfter) {
      filter.enrollmentDate.gte = new Date(query.enrolledAfter);
    }
    if (query.enrolledBefore) {
      filter.enrollmentDate.lte = new Date(query.enrolledBefore);
    }
  }

  // 마지막 접근 날짜 범위 필터
  if (query.lastAccessAfter || query.lastAccessBefore) {
    filter.lastAccessedTimestamp = {};
    if (query.lastAccessAfter) {
      filter.lastAccessedTimestamp.gte = new Date(query.lastAccessAfter);
    }
    if (query.lastAccessBefore) {
      filter.lastAccessedTimestamp.lte = new Date(query.lastAccessBefore);
    }
  }

  return filter;
}

// 정렬 옵션 생성 함수
export function createProgressOrderBy(query: ProgressQueryDto) {
  return {
    [query.sortBy]: query.sortOrder,
  };
}

// 진도 쿼리 검증 함수
export function validateProgressQuery(query: any): ProgressQueryDto {
  const result = progressQuerySchema.safeParse(query);
  if (!result.success) {
    throw new Error(
      `잘못된 진도 검색 쿼리: ${result.error.errors.map((e) => e.message).join(', ')}`
    );
  }
  return result.data;
}

// 진도 백분율을 상태 텍스트로 변환
export function getProgressStatusText(progress: number): string {
  if (progress === 0) return '시작 전';
  if (progress < 25) return '시작함';
  if (progress < 50) return '진행 중';
  if (progress < 75) return '절반 이상';
  if (progress < 100) return '거의 완료';
  return '완료';
}

// 진도 백분율을 색상으로 변환 (UI에서 사용)
export function getProgressColor(progress: number): string {
  if (progress === 0) return 'gray';
  if (progress < 25) return 'red';
  if (progress < 50) return 'orange';
  if (progress < 75) return 'yellow';
  if (progress < 100) return 'blue';
  return 'green';
}
