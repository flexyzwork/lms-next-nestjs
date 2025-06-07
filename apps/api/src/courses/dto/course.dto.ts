import { z } from 'zod';
import type {
  CreateCourseDto,
  UpdateCourseDto,
  CourseQueryDto,
} from '@packages/common';

import {
  createCourseSchema,
  updateCourseSchema,
  courseQuerySchema,
} from '@packages/common';

// re-export 스키마들
export {
  createCourseSchema as CreateCourseSchema,
  updateCourseSchema as UpdateCourseSchema,
  courseQuerySchema as CourseQuerySchema,
};

// re-export 타입들
export type { CreateCourseDto, UpdateCourseDto, CourseQueryDto };

// 비디오 업로드 관련 (API 전용)
export const UploadVideoUrlSchema = z.object({
  fileName: z.string().min(1, '파일명은 필수입니다'),
  fileType: z.string().min(1, '파일 타입은 필수입니다'),
});

export type UploadVideoUrlDto = z.infer<typeof UploadVideoUrlSchema>;

// Enum 타입들
export enum CourseStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum CourseLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum ChapterType {
  TEXT = 'Text',
  VIDEO = 'Video',
  QUIZ = 'Quiz',
}
