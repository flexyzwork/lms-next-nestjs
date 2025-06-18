"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import TeacherCourseCard from "@/components/TeacherCourseCard";
import Toolbar from "@/components/Toolbar";
import { Button } from "@/components/ui/button";
import {
  useCreateCourseMutation,
  useDeleteCourseMutation,
  useGetCoursesQuery,
} from "@/state/api";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

// 타입 정의 (임시)
interface Course {
  courseId: string;
  title: string;
  category: string;
  level: string;
  teacherId: string;
  status: string;
}

/**
 * 📚 강사 강의 관리 페이지 컨텐츠 (동적 로딩용)
 * 
 * 🚀 성능 최적화:
 * - 메모이제이션을 통한 불필요한 리렌더링 방지
 * - 상태 관리 최적화
 * - 이벤트 핸들러 최적화
 */
const TeacherCoursesContent = React.memo(() => {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    data: courses,
    isLoading,
    isError,
  } = useGetCoursesQuery({ category: "all" });

  const [createCourse] = useCreateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 🚀 메모이제이션으로 불필요한 필터링 방지
  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    return courses.filter((course) => {
      const matchesSearch = course.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || course.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchTerm, selectedCategory]);

  // 🚀 이벤트 핸들러 메모이제이션
  const handleEdit = useMemo(() => (course: Course) => {
    router.push(`/teacher/courses/${course.courseId}`, {
      scroll: false,
    });
  }, [router]);

  const handleDelete = useMemo(() => async (course: Course) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      await deleteCourse(course.courseId).unwrap();
    }
  }, [deleteCourse]);

  const handleCreateCourse = useMemo(() => async () => {
    if (!user) return;

    try {
      const result = await createCourse({
        teacherId: user.id,
        teacherName: user.username || "Unknown Teacher",
        title: "새 강의",
        category: "기타",
        level: "Beginner",
        description: "새로 생성된 강의입니다. 내용을 편집해주세요.",
        status: "Draft",
      }).unwrap();
      
      router.push(`/teacher/courses/${result.courseId}`, {
        scroll: false,
      });
    } catch (error) {
      console.error('강의 생성 실패:', error);
    }
  }, [user, createCourse, router]);

  // 🚀 조기 반환으로 불필요한 렌더링 방지
  if (isLoading) return <Loading />;
  if (isError || !courses) return <div>Error loading courses.</div>;

  return (
    <div className="teacher-courses">
      <Header
        title="Courses"
        subtitle="Browse your courses"
        rightElement={
          <Button
            onClick={handleCreateCourse}
            className="teacher-courses__header"
          >
            Create Course
          </Button>
        }
      />
      <Toolbar
        onSearch={setSearchTerm}
        onCategoryChange={setSelectedCategory}
      />
      <div className="teacher-courses__grid">
        {filteredCourses.map((course) => (
          <TeacherCourseCard
            key={course.courseId}
            course={course}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isOwner={course.teacherId === user?.id}
          />
        ))}
      </div>
    </div>
  );
});

TeacherCoursesContent.displayName = 'TeacherCoursesContent';

export default TeacherCoursesContent;