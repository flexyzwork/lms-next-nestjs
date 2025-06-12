'use client';

import Toolbar from '@/components/Toolbar';
import CourseCard from '@/components/CourseCard';
import { useGetUserEnrolledCoursesQuery } from '@/state/api';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

import { useState, useMemo, useEffect } from 'react';
import Loading from '@/components/Loading';
import { useAuthStore } from '@/stores/authStore';

const Courses = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 디버깅을 위한 사용자 정보 로깅
  useEffect(() => {
    console.log('🔍 Courses 페이지 - 현재 사용자 정보:', {
      user,
      userId: user?.id,
      id: user?.id,
      email: user?.email
    });
  }, [user]);

  const {
    data: courses,
    isLoading,
    isError,
    error,
  } = useGetUserEnrolledCoursesQuery(user?.id ?? '', {
    skip: !user?.id, // userId가 없으면 쿼리 건너뛰기
  });

  // 오류 상세 로깅
  useEffect(() => {
    if (isError) {
      console.error('❌ getUserEnrolledCourses 오류:', error);
    }
  }, [isError, error]);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    return courses.filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchTerm, selectedCategory]);

  const handleGoToCourse = (course: Course) => {
    if (course?.sections && course?.sections?.length > 0 && course?.sections[0].chapters?.length > 0) {
      const firstChapter = course.sections[0].chapters[0];
      router.push(`/user/courses/${course.courseId}/chapters/${firstChapter.chapterId}`, {
        scroll: false,
      });
    } else {
      console.error('No sections or chapters found for the course:', course);
      router.push(`/user/courses/${course.courseId}`, {
        scroll: false,
      });
    }
  };

  if (isLoading) return <Loading />;

  if (!user) {
    console.log('⚠️ 사용자 정보가 없음 - 로그인 페이지로 리다이렉트');
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">로그인이 필요합니다</h2>
        <p className="text-muted-foreground">수강 중인 강의를 보려면 로그인해주세요.</p>
        <button
          onClick={() => router.push('/signin')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          로그인하기
        </button>
      </div>
    );
  }

  if (!user.id) {
    console.log('⚠️ userId가 없음:', user);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">사용자 정보 오류</h2>
        <p className="text-muted-foreground">사용자 정보에 문제가 있습니다. 다시 로그인해주세요.</p>
        <button
          onClick={() => router.push('/signin')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          다시 로그인하기
        </button>
      </div>
    );
  }

  if (isError) {
    console.error('❌ 강의 목록 로딩 오류:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">강의 목록을 불러올 수 없습니다</h2>
        <p className="text-muted-foreground">네트워크 오류가 발생했습니다. 페이지를 새로고침해주세요.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          새로고침
        </button>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="user-courses">
        <Header title="My Courses" subtitle="View your enrolled courses" />
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <h2 className="text-xl font-semibold">수강 중인 강의가 없습니다</h2>
          <p className="text-muted-foreground">새로운 강의를 찾아 수강해보세요!</p>
          <button
            onClick={() => router.push('/search')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            강의 찾기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-courses">
      <Header title="My Courses" subtitle="View your enrolled courses" />
      <Toolbar onSearch={setSearchTerm} onCategoryChange={setSelectedCategory} />
      <div className="user-courses__grid">
        {filteredCourses.map((course) => (
          <CourseCard key={course.courseId} course={course} onGoToCourse={handleGoToCourse} />
        ))}
      </div>
    </div>
  );
};

export default Courses;
