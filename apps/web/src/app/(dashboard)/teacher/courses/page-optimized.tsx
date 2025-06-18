"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Loading from "@/components/Loading";

// 동적 임포트로 코드 스플리팅 적용
const TeacherCoursesContent = dynamic(
  () => import("@/components/pages/TeacherCoursesContent"),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

/**
 * 강사 강의 관리 페이지 (최적화 버전)
 * 
 * 성능 최적화:
 * - 동적 임포트로 초기 번들 크기 감소
 * - 코드 스플리팅으로 필요할 때만 로딩
 * - Suspense를 통한 부드러운 로딩 경험
 */
export default function TeacherCoursesPageOptimized() {
  return (
    <div className="teacher-courses-page-optimized">
      <Suspense fallback={<Loading />}>
        <TeacherCoursesContent />
      </Suspense>
    </div>
  );
}