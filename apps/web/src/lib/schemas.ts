import * as z from "zod";
import {
  emailSchema,
  courseLevelSchema,
  chapterTypeSchema,
  // UI 전용 스키마들
  courseEditorSchema,
  chapterFormSchema,
  sectionFormSchema,
  guestCheckoutSchema,
  uploadFormSchema,
  notificationSettingsSchema,
  progressUpdateSchema,
  // 타입들
  type CourseEditorFormData,
  type ChapterFormData,
  type SectionFormData,
  type GuestCheckoutFormData,
  type UploadFormData,
  type NotificationSettingsFormData,
  type ProgressUpdateFormData,
  // 유틸리티 함수들
  convertCourseFormToApi,
  formatFileSize,
  calculateProgress,
  formatPrice,
  getLevelText,
  getStatusText,
} from "@packages/schemas";

// ==============================
// 🎨 기존 호환성을 위한 재익스포트
// ==============================

// 기존 스키마 이름 호환성을 위한 별칭들
export const courseSchema = courseEditorSchema;
export const chapterSchema = chapterFormSchema;
export const sectionSchema = sectionFormSchema;
export const guestSchema = guestCheckoutSchema;

// 기존 타입 이름 호환성
export type CourseFormData = CourseEditorFormData;
export type GuestFormData = GuestCheckoutFormData;

// 모든 스키마와 타입 재익스포트
export {
  // 스키마들
  emailSchema,
  courseLevelSchema,
  chapterTypeSchema,
  courseEditorSchema,
  chapterFormSchema,
  sectionFormSchema,
  guestCheckoutSchema,
  uploadFormSchema,
  notificationSettingsSchema,
  progressUpdateSchema,
  // 타입들
  type CourseEditorFormData,
  type ChapterFormData,
  type SectionFormData,
  type GuestCheckoutFormData,
  type UploadFormData,
  type NotificationSettingsFormData,
  type ProgressUpdateFormData,
  // 유틸리티 함수들
  convertCourseFormToApi,
  formatFileSize,
  calculateProgress,
  formatPrice,
  getLevelText,
  getStatusText,
};

// ==============================
// 🔧 추가 웹 앱 전용 유틸리티 함수들
// ==============================

// 검색 필터를 쿼리 파라미터로 변환
export function convertSearchFilterToQuery(filter: any) {
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

// 텍스트 자르기 (말줄임표 추가)
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
