import { z } from 'zod';
import { emailSchema } from '../base';
import { courseLevelSchema, chapterTypeSchema } from '../course';

// ==============================
// 🎨 웹 UI 전용 스키마들
// ==============================

// 강의 에디터용 스키마 (웹 UI 전용)
export const courseEditorSchema = z
  .object({
    courseTitle: z
      .string()
      .min(1, '제목은 필수입니다')
      .max(200, '제목은 200자를 초과할 수 없습니다'),
    courseDescription: z
      .string()
      .min(1, '설명은 필수입니다')
      .max(2000, '설명은 2000자를 초과할 수 없습니다'),
    courseCategory: z
      .string()
      .min(1, '카테고리는 필수입니다')
      .max(50, '카테고리는 50자를 초과할 수 없습니다'),
    coursePrice: z.string().transform((val) => {
      if (!val || val === '') return 0;
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('유효한 숫자가 아닙니다');
      if (num < 0) throw new Error('가격은 0 이상이어야 합니다');
      return num;
    }),
    courseLevel: courseLevelSchema,
    courseStatus: z.boolean().transform((val) => (val ? 'Published' : 'Draft')),
    courseImage: z.string().url('올바른 이미지 URL을 입력해주세요').optional(),
  })
  .strict();

// 챕터 폼 스키마 (웹 UI 전용)
export const chapterFormSchema = z
  .object({
    title: z
      .string()
      .min(2, '제목은 최소 2자 이상이어야 합니다')
      .max(200, '제목은 200자를 초과할 수 없습니다'),
    content: z
      .string()
      .min(10, '내용은 최소 10자 이상이어야 합니다')
      .max(10000, '내용은 10000자를 초과할 수 없습니다'),
    type: chapterTypeSchema.default('Text'),
    video: z
      .union([
        z.string().url('올바른 비디오 URL을 입력해주세요'),
        z.instanceof(File),
      ])
      .optional(),
  })
  .strict();

// 섹션 폼 스키마 (웹 UI 전용)
export const sectionFormSchema = z
  .object({
    title: z
      .string()
      .min(2, '제목은 최소 2자 이상이어야 합니다')
      .max(200, '제목은 200자를 초과할 수 없습니다'),
    description: z
      .string()
      .min(10, '설명은 최소 10자 이상이어야 합니다')
      .max(1000, '설명은 1000자를 초과할 수 없습니다'),
  })
  .strict();

// 게스트 체크아웃 스키마
export const guestCheckoutSchema = z
  .object({
    email: emailSchema,
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: '이용약관에 동의해야 합니다',
    }),
    agreeToPrivacy: z.boolean().refine((val) => val === true, {
      message: '개인정보처리방침에 동의해야 합니다',
    }),
  })
  .strict();

// 파일 업로드 스키마 (웹 UI 전용)
export const uploadFormSchema = z
  .object({
    file: z
      .instanceof(File)
      .refine((file) => file.size > 0, {
        message: '파일이 비어있습니다',
      })
      .refine((file) => {
        const maxSize = 100 * 1024 * 1024; // 100MB
        return file.size <= maxSize;
      }, '파일 크기는 100MB를 초과할 수 없습니다'),
    description: z
      .string()
      .max(200, '파일 설명은 200자를 초과할 수 없습니다')
      .optional(),
  })
  .strict();

// 알림 설정 스키마 (웹 UI 전용)
export const notificationSettingsSchema = z
  .object({
    courseNotifications: z.boolean().default(true),
    emailAlerts: z.boolean().default(true),
    smsAlerts: z.boolean().default(false),
    pushNotifications: z.boolean().default(true),
    notificationFrequency: z
      .enum(['immediate', 'daily', 'weekly'], {
        errorMap: () => ({
          message: '알림 빈도는 immediate, daily, weekly 중 하나여야 합니다',
        }),
      })
      .default('immediate'),
    marketingEmails: z.boolean().default(false),
    newCourseAlerts: z.boolean().default(true),
    progressReminders: z.boolean().default(true),
  })
  .strict();

// 진도 업데이트 스키마 (웹 UI 전용)
export const progressUpdateSchema = z
  .object({
    chapterId: z.string().min(1),
    completed: z.boolean(),
    timeSpent: z.number().min(0).optional(), // 초 단위
    notes: z.string().max(500, '노트는 500자를 초과할 수 없습니다').optional(),
    rating: z.number().min(1).max(5).optional(),
  })
  .strict();

// 기존 스키마 이름 호환성을 위한 별칭들
export const courseSchema = courseEditorSchema;
// export const chapterSchema = chapterFormSchema;
// export const sectionSchema = sectionFormSchema;
export const guestSchema = guestCheckoutSchema;

// TypeScript 타입 추출
export type CourseEditorFormData = z.infer<typeof courseEditorSchema>;
export type ChapterFormData = z.infer<typeof chapterFormSchema>;
export type SectionFormData = z.infer<typeof sectionFormSchema>;
export type GuestCheckoutFormData = z.infer<typeof guestCheckoutSchema>;
export type UploadFormData = z.infer<typeof uploadFormSchema>;
export type NotificationSettingsFormData = z.infer<
  typeof notificationSettingsSchema
>;
export type ProgressUpdateFormData = z.infer<typeof progressUpdateSchema>;

// 기존 타입 이름 호환성
export type CourseFormData = CourseEditorFormData;
export type GuestFormData = GuestCheckoutFormData;

// ==============================
// 🔧 웹 UI 전용 유틸리티 함수들
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

// 가격 포맷팅 (한국 원화)
export function formatPrice(price: number): string {
  if (price === 0) return '무료';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(price);
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
