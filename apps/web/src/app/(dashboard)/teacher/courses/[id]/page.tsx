'use client';

import { CustomFormField } from '@/components/CustomFormField';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { courseSchema } from '@/lib/schemas';
import { centsToDollars, createCourseFormData, uploadAllVideos } from '@/lib/utils';
import { openSectionModal, setSections } from '@/state';
import { useGetCourseQuery, useUpdateCourseMutation, useGetUploadVideoUrlMutation } from '@/state/api';
import { useAppDispatch, useAppSelector } from '@/state/redux';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DroppableComponent from './Droppable';
import ChapterModal from './ChapterModal';
import SectionModal from './SectionModal';

const CourseEditor = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: course, isLoading, refetch } = useGetCourseQuery(id);
  const [updateCourse] = useUpdateCourseMutation();
  const [getUploadVideoUrl] = useGetUploadVideoUrlMutation();

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
    try {
      const updatedSections = await uploadAllVideos(sections, id, getUploadVideoUrl);

      const formData = createCourseFormData(data, updatedSections);

      await updateCourse({
        courseId: id,
        formData,
      }).unwrap();

      refetch();
    } catch (error) {
      console.error('Failed to update course:', error?.data || error);
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
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {methods.watch('courseStatus') ? 'Update Published Course' : 'Save Draft'}
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
    </div>
  );
};

export default CourseEditor;
