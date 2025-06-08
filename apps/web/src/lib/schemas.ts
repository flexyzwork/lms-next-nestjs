import * as z from "zod";
import {
  emailSchema,
  courseLevelSchema,
  chapterTypeSchema,
} from "./common-schemas";

// ==============================
// 🎨 웹 앱 전용 폼 스키마 (UI 특화)
// ==============================

// 강의 에디터용 스키마 (웹 UI 전용)
export const courseEditorSchema = z.object({
  courseTitle: z.string().min(1, "제목은 필수입니다").max(200, "제목은 200자를 초과할 수 없습니다"),
  courseDescription: z.string().min(1, "설명은 필수입니다").max(2000, "설명은 2000자를 초과할 수 없습니다"),
  courseCategory: z.string().min(1, "카테고리는 필수입니다").max(50, "카테고리는 50자를 초과할 수 없습니다"),
  coursePrice: z.string().transform((val) => {
    if (!val || val === '') return 0;
    const num = parseFloat(val);
    if (isNaN(num)) throw new Error('유효한 숫자가 아닙니다');
    if (num < 0) throw new Error('가격은 0 이상이어야 합니다');
    return num;
  }),
  courseLevel: courseLevelSchema,
  courseStatus: z.boolean().transform((val) => val ? 'Published' : 'Draft'),
  courseImage: z.string().url("올바른 이미지 URL을 입력해주세요").optional(),
}).strict();

// 챕터 폼 스키마 (웹 UI 전용)
export const chapterFormSchema = z.object({
  title: z.string().min(2, "제목은 최소 2자 이상이어야 합니다").max(200, "제목은 200자를 초과할 수 없습니다"),
  content: z.string().min(10, "내용은 최소 10자 이상이어야 합니다").max(10000, "내용은 10000자를 초과할 수 없습니다"),
  type: chapterTypeSchema.default('Text'),
  video: z.union([
    z.string().url("올바른 비디오 URL을 입력해주세요"),
    z.instanceof(File)
  ]).optional(),
}).strict();

// 섹션 폼 스키마 (웹 UI 전용)
export const sectionFormSchema = z.object({
  title: z.string().min(2, "제목은 최소 2자 이상이어야 합니다").max(200, "제목은 200자를 초과할 수 없습니다"),
  description: z.string().min(10, "설명은 최소 10자 이상이어야 합니다").max(1000, "설명은 1000자를 초과할 수 없습니다"),
}).strict();

// 게스트 체크아웃 스키마
export const guestCheckoutSchema = z.object({
  email: emailSchema,
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "이용약관에 동의해야 합니다"
  }),
  agreeToPrivacy: z.boolean().refine(val => val === true, {
    message: "개인정보처리방침에 동의해야 합니다"
  }),
}).strict();

// 알림 설정 스키마 (웹 UI 전용)
export const notificationSettingsSchema = z.object({
  courseNotifications: z.boolean().default(true),
  emailAlerts: z.boolean().default(true),
  smsAlerts: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
  notificationFrequency: z.enum(["immediate", "daily", "weekly"], {
    errorMap: () => ({ message: "알림 빈도는 immediate, daily, weekly 중 하나여야 합니다" })
  }).default("immediate"),
  marketingEmails: z.boolean().default(false),
  newCourseAlerts: z.boolean().default(true),
  progressReminders: z.boolean().default(true),
}).strict();

// 검색 필터 스키마 (웹 UI 전용)
export const courseSearchFilterSchema = z.object({
  query: z.string().max(100, "검색어는 100자를 초과할 수 없습니다").optional(),
  category: z.string().optional(),
  level: courseLevelSchema.optional(),
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  rating: z.number().min(1).max(5).optional(),
  duration: z.enum(["short", "medium", "long"]).optional(), // 1시간 미만, 1-5시간, 5시간 이상
  isFree: z.boolean().optional(),
  hasSubtitles: z.boolean().optional(),
  language: z.enum(["ko", "en"]).optional(),
}).strict();

// 강의 리뷰 스키마 (웹 UI 전용)
export const courseReviewSchema = z.object({
  rating: z.number().min(1, "평점은 1 이상이어야 합니다").max(5, "평점은 5 이하여야 합니다"),
  title: z.string().min(5, "제목은 최소 5자 이상이어야 합니다").max(100, "제목은 100자를 초과할 수 없습니다"),
  content: z.string().min(20, "리뷰 내용은 최소 20자 이상이어야 합니다").max(1000, "리뷰는 1000자를 초과할 수 없습니다"),
  wouldRecommend: z.boolean(),
  helpfulAspects: z.array(z.enum([
    "content_quality",
    "instructor_teaching",
    "practical_examples",
    "course_structure",
    "support_materials"
  ])).optional(),
}).strict();

// 학습 목표 설정 스키마 (웹 UI 전용)
export const learningGoalSchema = z.object({
  title: z.string().min(5, "목표 제목은 최소 5자 이상이어야 합니다").max(100, "목표 제목은 100자를 초과할 수 없습니다"),
  description: z.string().max(500, "목표 설명은 500자를 초과할 수 없습니다").optional(),
  targetDate: z.string().date("올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  category: z.string().max(50, "카테고리는 50자를 초과할 수 없습니다").optional(),
}).strict();

// 학습 일정 스키마 (웹 UI 전용)
export const studyScheduleSchema = z.object({
  daysOfWeek: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]))
    .min(1, "최소 1일은 선택해야 합니다"),
  timeSlot: z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "올바른 시간 형식이 아닙니다 (HH:MM)"),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "올바른 시간 형식이 아닙니다 (HH:MM)"),
  }),
  duration: z.number().min(15, "최소 15분 이상이어야 합니다").max(480, "최대 8시간까지 가능합니다"), // 분 단위
  reminderEnabled: z.boolean().default(true),
  reminderTime: z.number().min(5).max(60).default(15), // 알림 시간 (분 전)
}).strict();

// 파일 업로드 스키마 (웹 UI 전용) - 기존 UploadFormSchema 개선
export const uploadFormSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size > 0, {
      message: "파일이 비어있습니다",
    })
    .refine((file) => {
      const maxSize = 100 * 1024 * 1024; // 100MB
      return file.size <= maxSize;
    }, "파일 크기는 100MB를 초과할 수 없습니다"),
  description: z.string().max(200, "파일 설명은 200자를 초과할 수 없습니다").optional(),
}).strict();

// 기존 스키마 이름 호환성을 위한 별칭들
export const courseSchema = courseEditorSchema;
export const chapterSchema = chapterFormSchema;
export const sectionSchema = sectionFormSchema;
export const guestSchema = guestCheckoutSchema;

// 기존 타입 이름 호환성
export type CourseFormData = CourseEditorFormData;
// export type ChapterFormData = z.infer<typeof chapterFormSchema>;
// export type SectionFormData = z.infer<typeof sectionFormSchema>;
export type GuestFormData = GuestCheckoutFormData;

// 진도 업데이트 스키마 (웹 UI 전용)
export const progressUpdateSchema = z.object({
  chapterId: z.string().min(1),
  completed: z.boolean(),
  timeSpent: z.number().min(0).optional(), // 초 단위
  notes: z.string().max(500, "노트는 500자를 초과할 수 없습니다").optional(),
  rating: z.number().min(1).max(5).optional(),
}).strict();

// 즐겨찾기 스키마 (웹 UI 전용)
export const favoriteSchema = z.object({
  courseId: z.string().min(1),
  action: z.enum(["add", "remove"]),
}).strict();

// TypeScript 타입 추출
export type CourseEditorFormData = z.infer<typeof courseEditorSchema>;
export type ChapterFormData = z.infer<typeof chapterFormSchema>;
export type SectionFormData = z.infer<typeof sectionFormSchema>;
export type GuestCheckoutFormData = z.infer<typeof guestCheckoutSchema>;
export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;
export type CourseSearchFilterData = z.infer<typeof courseSearchFilterSchema>;
export type CourseReviewFormData = z.infer<typeof courseReviewSchema>;
export type LearningGoalFormData = z.infer<typeof learningGoalSchema>;
export type StudyScheduleFormData = z.infer<typeof studyScheduleSchema>;
export type UploadFormData = z.infer<typeof uploadFormSchema>;
export type ProgressUpdateFormData = z.infer<typeof progressUpdateSchema>;
export type FavoriteFormData = z.infer<typeof favoriteSchema>;

// ==============================
// 🔧 웹 앱 전용 유틸리티 함수들
// ==============================

// 폼 데이터를 API 스키마로 변환
export function convertCourseFormToApi(formData: CourseEditorFormData) {
  return {
    title: formData.courseTitle,
    description: formData.courseDescription,
    category: formData.courseCategory,
    price: formData.coursePrice,
    level: formData.courseLevel,
    status: formData.courseStatus as 'Draft' | 'Published',
    image: formData.courseImage,
  };
}

// 검색 필터를 쿼리 파라미터로 변환
export function convertSearchFilterToQuery(filter: CourseSearchFilterData) {
  const query: Record<string, string> = {};

  if (filter.query) query.search = filter.query;
  if (filter.category) query.category = filter.category;
  if (filter.level) query.level = filter.level;
  if (filter.priceRange?.min !== undefined) query.minPrice = filter.priceRange.min.toString();
  if (filter.priceRange?.max !== undefined) query.maxPrice = filter.priceRange.max.toString();
  if (filter.isFree) query.isFree = filter.isFree.toString();
  if (filter.language) query.language = filter.language;

  return query;
}

// 파일 유형 검증
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => file.type.startsWith(type));
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 진도율 계산
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// 시간 포맷팅 (초 -> 시:분:초)
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 별점 표시용 배열 생성
export function generateStarArray(rating: number): Array<'full' | 'half' | 'empty'> {
  const stars: Array<'full' | 'half' | 'empty'> = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < fullStars; i++) {
    stars.push('full');
  }

  if (hasHalfStar) {
    stars.push('half');
  }

  while (stars.length < 5) {
    stars.push('empty');
  }

  return stars;
}

// 날짜 포맷팅 (한국어)
export function formatDateKo(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 상대 시간 표시 (예: "3일 전")
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();

  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (diff < minute) return '방금 전';
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < week) return `${Math.floor(diff / day)}일 전`;
  if (diff < month) return `${Math.floor(diff / week)}주 전`;
  if (diff < year) return `${Math.floor(diff / month)}개월 전`;

  return `${Math.floor(diff / year)}년 전`;
}

// 가격 포맷팅 (한국 원화)
export function formatPrice(price: number): string {
  if (price === 0) return '무료';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(price);
}

// 텍스트 자르기 (말줄임표 추가)
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// 레벨 텍스트 변환
export function getLevelText(level: string): string {
  switch (level) {
    case 'Beginner':
      return '초급';
    case 'Intermediate':
      return '중급';
    case 'Advanced':
      return '고급';
    default:
      return level;
  }
}

// 상태 텍스트 변환
export function getStatusText(status: string): string {
  switch (status) {
    case 'Draft':
      return '초안';
    case 'Published':
      return '출간됨';
    default:
      return status;
  }
}
