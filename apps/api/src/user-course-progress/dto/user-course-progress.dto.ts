import { z } from 'zod';
import {
  chapterProgressSchema,
  sectionProgressSchema,
  updateUserCourseProgressSchema,
  idSchema, // 🆔 CUID2 사용
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

// API 전용 파라미터 스키마들 - 🆔 CUID2 사용
export const UserCourseProgressParamsSchema = z.object({
  userId: idSchema,
  courseId: idSchema,
});

export const UserEnrolledCoursesParamsSchema = z.object({
  userId: idSchema,
});

export type UserCourseProgressParamsDto = z.infer<
  typeof UserCourseProgressParamsSchema
>;
export type UserEnrolledCoursesParamsDto = z.infer<
  typeof UserEnrolledCoursesParamsSchema
>;
