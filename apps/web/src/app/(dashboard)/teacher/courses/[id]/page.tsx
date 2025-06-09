'use client';

import { CustomFormField } from '@/components/CustomFormField';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { courseSchema } from '@/lib/schemas';
import { centsToDollars, createCourseFormData, uploadAllVideos, logFormData } from '@/lib/utils';
import { openSectionModal, setSections } from '@/state';
import { useGetCourseQuery, useUpdateCourseMutation, useGetUploadVideoUrlMutation } from '@/state/api';
import { useAppDispatch, useAppSelector } from '@/state/redux';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import DroppableComponent from './Droppable';
import ChapterModal from './ChapterModal';
import SectionModal from './SectionModal';
import DebugInfo from '@/components/DebugInfo';

const CourseEditor = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: course, isLoading, refetch } = useGetCourseQuery(id);
  const [updateCourse] = useUpdateCourseMutation();
  const [getUploadVideoUrl] = useGetUploadVideoUrlMutation();

  // 제출 상태 관리를 위한 로컬 state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useAppDispatch();
  const { sections } = useAppSelector((state) => state.global.courseEditor);

  const methods = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      courseTitle: '',
      courseDescription: '',
      courseCategory: '',
      coursePrice: '0',
      courseStatus: false,
    },
  });

  useEffect(() => {
    if (course) {
      methods.reset({
        courseTitle: course.title,
        courseDescription: course.description,
        courseCategory: course.category,
        coursePrice: centsToDollars(course.price),
        courseStatus: course.status === 'Published',
      });
      dispatch(setSections(course.sections || []));
    }
  }, [course, methods]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: CourseFormData) => {
    console.log('🚀 onSubmit 시작:', data);
    console.log('📋 현재 섹션 데이터:', sections);
    console.log('🆔 강의 ID:', id);
    
    // 중복 제출 방지
    if (isSubmitting) {
      console.log('⚠️ 이미 제출 중이므로 무시');
      return;
    }
    
    // 기본 유효성 검사
    if (!id) {
      console.error('❌ 강의 ID가 없습니다!');
      alert('강의 ID가 없습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    // 폼 유효성 검사 먼저 확인
    const formErrors = methods.formState.errors;
    if (Object.keys(formErrors).length > 0) {
      console.error('❌ 폼 유효성 검사 실패:', formErrors);
      alert('폼에 오류가 있습니다. 모든 필드를 올바르게 입력해주세요.');
      return;
    }
    
    // 필수 필드 검사
    if (!data.courseTitle?.trim()) {
      console.error('❌ 강의 제목이 비어있습니다.');
      alert('강의 제목을 입력해주세요.');
      return;
    }
    
    // 제출 상태 설정
    setIsSubmitting(true);
    
    try {
      console.log('📹 비디오 업로드 시작...');
      const updatedSections = await uploadAllVideos(sections, id, getUploadVideoUrl);
      console.log('✅ 비디오 업로드 완료:', updatedSections);

      console.log('📦 FormData 생성 중...');
      const formData = createCourseFormData(data, updatedSections);
      
      // FormData 내용 확인 (헬퍼 함수 사용)
      logFormData(formData, '생성된 FormData');
      
      // FormData 유효성 검사
      const requiredFields = ['title', 'description', 'category', 'price', 'status'];
      const missingFields: string[] = [];
      
      for (const field of requiredFields) {
        const value = formData.get(field);
        if (!value || (typeof value === 'string' && !value.trim())) {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        console.error('❌ FormData 유효성 검사 실패:', missingFields);
        alert(`누락된 필수 필드: ${missingFields.join(', ')}`);
        return;
      }

      console.log('🔄 API 호출 시작...');
      console.log('🆔 강의 ID:', id);
      
      const result = await updateCourse({
        courseId: id,
        formData,
      }).unwrap();
      
      console.log('✅ API 호출 성공!');
      console.log('📋 응답 데이터:', result);

      console.log('🔄 데이터 재로드 중...');
      await refetch();
      console.log('✅ 강의 업데이트 완료!');
      
      // 성공 토스트 알림
      alert('강의가 성공적으로 업데이트되었습니다!');
    } catch (error: any) {
      console.error('❌ 강의 업데이트 실패:', error);
      console.error('❌ 에러 상세:', error?.data || error);
      
      // 상세한 에러 메시지 구성
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.status) {
        errorMessage = `HTTP ${error.status} 오류가 발생했습니다.`;
      } else if (error?.error) {
        errorMessage = error.error;
      }
      
      console.error('🚨 최종 에러 메시지:', errorMessage);
      alert(`강의 업데이트 실패: ${errorMessage}`);
    } finally {
      // 제출 상태 해제
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-5 mb-5">
        <button
          className="flex items-center border rounded-lg p-2 gap-2 cursor-pointer transition-colors duration-200 border-border text-text-medium hover:bg-hover-bg hover:text-foreground"
          onClick={() => router.push('/teacher/courses', { scroll: false })}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Courses</span>
        </button>
      </div>

      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Header
            title="Course Setup"
            subtitle="Complete all fields and save your course"
            rightElement={
              <div className="flex items-center space-x-4">
                <CustomFormField
                  name="courseStatus"
                  label={methods.watch('courseStatus') ? 'Published' : 'Draft'}
                  type="switch"
                  className="flex items-center space-x-2"
                  labelClassName={`text-sm font-medium ${
                    methods.watch('courseStatus') ? 'text-green-500' : 'text-yellow-500'
                  }`}
                  inputClassName="data-[state=checked]:bg-green-500"
                />
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                  disabled={isSubmitting || methods.formState.isSubmitting}
                  onClick={(e) => {
                    console.log('💥 버튼 클릭 이벤트 발생!');
                    console.log('📋 버튼 타입:', e.currentTarget.type);
                    console.log('💆 버튼 클릭됨:', methods.watch('courseStatus') ? 'Update Published Course' : 'Save Draft');
                    console.log('📝 현재 폼 상태:', methods.getValues());
                    console.log('🔍 폼 유효성 검사 상태:', methods.formState.isValid);
                    console.log('🔍 폼 에러:', methods.formState.errors);
                    console.log('🔍 현재 제출 중 상태:', methods.formState.isSubmitting);
                    
                    // 이벤트 전파 중단 막기 (중복 호출 방지)
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // 수동으로 폼 제출 트리거 (이벤트가 제대로 작동하는지 확인)
                    if (!isSubmitting && !methods.formState.isSubmitting) {
                      console.log('🚀 수동으로 폼 제출 트리거...');
                      const formData = methods.getValues();
                      onSubmit(formData);
                    } else {
                      console.log('⚠️ 이미 제출 중이므로 무시');
                    }
                  }}
                >
                  {(isSubmitting || methods.formState.isSubmitting) 
                    ? '업데이트 중...' 
                    : (methods.watch('courseStatus') ? 'Update Published Course' : 'Save Draft')
                  }
                </Button>
              </div>
            }
          />

          <div className="flex justify-between md:flex-row flex-col gap-10 mt-5 font-dm-sans">
            <div className="basis-1/2">
              <div className="space-y-4">
                <CustomFormField
                  name="courseTitle"
                  label="Course Title"
                  type="text"
                  placeholder="Write course title here"
                  className="border-none themed-input"
                  initialValue={course?.title}
                />

                <CustomFormField
                  name="courseDescription"
                  label="Course Description"
                  type="textarea"
                  placeholder="Write course description here"
                  initialValue={course?.description}
                  className="border-none themed-input"
                />

                <CustomFormField
                  className="border-none themed-input"
                  name="courseCategory"
                  label="Course Category"
                  type="select"
                  placeholder="Select category here"
                  options={[
                    { value: 'technology', label: 'Technology' },
                    { value: 'science', label: 'Science' },
                    { value: 'mathematics', label: 'Mathematics' },
                    { value: 'devops', label: 'DevOps' },
                    { value: 'container', label: 'Container' },
                    {
                      value: 'Artificial Intelligence',
                      label: 'Artificial Intelligence',
                    },
                  ]}
                  initialValue={course?.category}
                />

                <CustomFormField
                  className="border-none themed-input"
                  name="coursePrice"
                  label="Course Price"
                  type="number"
                  placeholder="0"
                  initialValue={course?.price}
                />
              </div>
            </div>

            <div className="bg-secondary-bg mt-4 md:mt-0 p-4 rounded-lg basis-1/2 border border-border">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-semibold text-foreground">Sections</h2>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch(openSectionModal({ sectionIndex: null }))}
                  className="border-border text-primary hover:bg-accent hover:text-accent-foreground group"
                >
                  <Plus className="mr-1 h-4 w-4 text-primary group-hover:text-accent-foreground" />
                  <span className="text-primary group-hover:text-accent-foreground">Add Section</span>
                </Button>
              </div>

              {isLoading ? (
                <p className="text-text-medium">Loading course content...</p>
              ) : sections.length > 0 ? (
                <DroppableComponent />
              ) : (
                <p className="text-text-medium">No sections available</p>
              )}
            </div>
          </div>
        </form>
      </Form>

      <ChapterModal />
      <SectionModal />
      <DebugInfo />
    </div>
  );
};

export default CourseEditor;
