import { z } from 'zod';
import {
  chapterProgressSchema,
  sectionProgressSchema,
  updateUserCourseProgressSchema,
} from '@packages/common';

import {
  ChapterProgressDto,
  SectionProgressDto,
  UpdateUserCourseProgressDto,
} from '@packages/common';

// re-export 스키마들
export {
  chapterProgressSchema as ChapterProgressSchema,
  sectionProgressSchema as SectionProgressSchema,
  updateUserCourseProgressSchema as UpdateUserCourseProgressSchema,
};

// re-export 타입들
export type {
  ChapterProgressDto,
  SectionProgressDto,
  UpdateUserCourseProgressDto,
};

// API 전용 파라미터 스키마들
export const UserCourseProgressParamsSchema = z.object({
  userId: z.string().uuid('올바른 사용자 ID를 입력해주세요'),
  courseId: z.string().uuid('올바른 강의 ID를 입력해주세요'),
});

export const UserEnrolledCoursesParamsSchema = z.object({
  userId: z.string().uuid('올바른 사용자 ID를 입력해주세요'),
});

export type UserCourseProgressParamsDto = z.infer<
  typeof UserCourseProgressParamsSchema
>;
export type UserEnrolledCoursesParamsDto = z.infer<
  typeof UserEnrolledCoursesParamsSchema
>;
