import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BaseQueryApi, FetchArgs } from '@reduxjs/toolkit/query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { refreshAccessToken } from '@/services/authService';

const customBaseQuery = async (args: string | FetchArgs, api: BaseQueryApi, extraOptions: any) => {
  // 🔧 API URL 설정 명확화
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  
  console.log('🔍 API 설정 정보:');
  console.log('  - Base URL:', baseUrl);
  console.log('  - 환경 변수 NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
  console.log('  - 요청 URL:', typeof args === 'string' ? args : args.url);
  console.log('  - 최종 요청 경로:', typeof args === 'string' ? `${baseUrl}/${args}` : `${baseUrl}/${args.url}`);

  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        console.log('🔑 API 호출에 토큰 추가됨');
        console.log('🔑 토큰 미리보기:', token.substring(0, 30) + '...');
      } else {
        console.log('⚠️ API 호출 시 토큰이 없음');
      }
      return headers;
    },
  });

  try {
    console.log('📤 API 요청 시작:', typeof args === 'string' ? args : args);
    const result: any = await baseQuery(args, api, extraOptions);
    console.log('📥 API 응답 받음:', {
      status: result.meta?.response?.status,
      hasError: !!result.error,
      hasData: !!result.data
    });

    if (result.error) {
      const errorData = result.error.data;
      const errorMessage = errorData?.message || result.error.status.toString() || 'An error occurred';
      console.error('❌ API 오류:', {
        url: typeof args === 'string' ? args : args.url,
        fullUrl: typeof args === 'string' ? `${baseUrl}/${args}` : `${baseUrl}/${args.url}`,
        status: result.error.status,
        message: errorMessage,
        errorData
      });
      toast.error(`Error: ${errorMessage}`);
    }

    const isMutationRequest = (args as FetchArgs).method && (args as FetchArgs).method !== 'GET';

    if (isMutationRequest) {
      const successMessage = result.data?.message;
      if (successMessage) toast.success(successMessage);
    }

    if (result.data) {
      result.data = result.data.data;
    } else if (result.error?.status === 204 || result.meta?.response?.status === 204) {
      return { data: null };
    }

    // 응답이 없거나 빈 객체라면 기본 값 추가
    if (!result.data && !result.error) {
      return { data: {} };
    }

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ API 요청 중 예외 발생:', errorMessage);
    return { error: { status: 'FETCH_ERROR', error: errorMessage } };
  }
};

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  const { logout, setToken } = useAuthStore.getState();
  let result = await customBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    console.warn('🔄 Access token expired, trying refresh...');

    // ✅ Refresh Token 요청
    const refreshResult = await refreshAccessToken();

    if (refreshResult && refreshResult.token) {
      console.log('✅ Token refreshed successfully!');

      // ✅ 원래 요청 다시 시도
      result = await customBaseQuery(args, api, extraOptions);
    } else {
      console.error('❌ Refresh failed, logging out...');
      api.dispatch(logout());
    }
  }

  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  reducerPath: 'api',
  tagTypes: ['Courses', 'Users', 'UserCourseProgress'],
  endpoints: (build) => ({
    /* 
    ===============
    USER CLERK
    =============== 
    */
    updateUser: build.mutation<User, Partial<User> & { userId: string }>({
      query: ({ userId, ...updatedUser }) => ({
        url: `users/${userId}`,
        method: 'PATCH',
        body: updatedUser,
      }),
      invalidatesTags: ['Users'],
    }),

    /* 
    ===============
    COURSES
    =============== 
    */
    getCourses: build.query<Course[], { category?: string }>({
      query: ({ category }) => ({
        url: 'courses',
        params: { category },
      }),
      providesTags: ['Courses'],
    }),

    getCourse: build.query<Course, string>({
      query: (id) => `courses/${id}`,
      providesTags: (result, error, id) => [{ type: 'Courses', id }],
    }),

    createCourse: build.mutation<Course, {
      teacherId: string;
      teacherName: string;
      title: string;
      category: string;
      level: 'Beginner' | 'Intermediate' | 'Advanced';
      description?: string;
      price?: number;
      status?: 'Draft' | 'Published';
      image?: string;
    }>({
      query: (body) => ({
        url: `courses`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Courses'],
    }),

    updateCourse: build.mutation<Course, { courseId: string; formData: FormData }>({
      query: ({ courseId, formData }) => {
        console.log('📚 updateCourse API mutation 시작:');
        console.log('  - 강의 ID:', courseId);
        console.log('  - FormData 유형:', formData.constructor.name);
        
        // FormData 내용 로그 (디버깅용)
        console.log('  - FormData 내용:');
        for (const [key, value] of formData.entries()) {
          if (typeof value === 'string') {
            console.log(`    ${key}: ${value.length > 50 ? value.substring(0, 50) + '...' : value}`);
          } else {
            console.log(`    ${key}: [File] ${(value as File).name}`);
          }
        }
        
        return {
          url: `courses/${courseId}`,
          method: 'PUT',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { courseId }) => {
        console.log('🔄 updateCourse 캐시 무효화:', courseId);
        return [{ type: 'Courses', id: courseId }];
      },
    }),

    deleteCourse: build.mutation<{ message: string }, string>({
      query: (courseId) => ({
        url: `courses/${courseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Courses'],
    }),

    getUploadVideoUrl: build.mutation<
      { uploadUrl: string; videoUrl: string },
      {
        courseId: string;
        chapterId: string;
        sectionId: string;
        fileName: string;
        fileType: string;
      }
    >({
      query: ({ courseId, sectionId, chapterId, fileName, fileType }) => ({
        url: `courses/${courseId}/sections/${sectionId}/chapters/${chapterId}/get-upload-url`,
        method: 'POST',
        body: { fileName, fileType },
      }),
    }),

    /* 
    ===============
    TRANSACTIONS
    =============== 
    */
    getTransactions: build.query<Transaction[], string>({
      query: (userId) => {
        console.log('🔍 getTransactions 호출 - userId:', userId);
        if (!userId) {
          console.error('❌ userId가 없어서 API 호출을 건너뜁니다');
          throw new Error('userId가 필요합니다');
        }
        return `transactions?userId=${userId}`;
      },
    }),
    createStripePaymentIntent: build.mutation<{ clientSecret: string }, { amount: number }>({
      query: ({ amount }) => ({
        url: `/transactions/stripe/payment-intent`,
        method: 'POST',
        body: { amount },
      }),
    }),
    createTransaction: build.mutation<Transaction, Partial<Transaction>>({
      query: (transaction) => ({
        url: 'transactions',
        method: 'POST',
        body: transaction,
      }),
    }),

    /* 
    ===============
    USER COURSE PROGRESS
    =============== 
    */
    getUserEnrolledCourses: build.query<Course[], string>({
      query: (userId) => {
        console.log('🔍 getUserEnrolledCourses 호출 - userId:', userId);
        if (!userId) {
          console.error('❌ userId가 없어서 API 호출을 건너뜁니다');
          throw new Error('userId가 필요합니다');
        }
        return `users/course-progress/${userId}/enrolled-courses`;
      },
      providesTags: ['Courses', 'UserCourseProgress'],
    }),

    getUserCourseProgress: build.query<UserCourseProgress, { userId: string; courseId: string }>({
      query: ({ userId, courseId }) => {
        console.log('🔍 getUserCourseProgress 호출 - userId:', userId, 'courseId:', courseId);
        if (!userId || !courseId) {
          console.error('❌ userId 또는 courseId가 없어서 API 호출을 건너뜁니다');
          throw new Error('userId와 courseId가 필요합니다');
        }
        return `users/course-progress/${userId}/courses/${courseId}`;
      },
      providesTags: ['UserCourseProgress'],
    }),

    updateUserCourseProgress: build.mutation<
      UserCourseProgress,
      {
        userId: string;
        courseId: string;
        progressData: {
          sections: SectionProgress[];
        };
      }
    >({
      query: ({ userId, courseId, progressData }) => ({
        url: `users/course-progress/${userId}/courses/${courseId}`,
        method: 'PUT',
        body: progressData,
      }),
      invalidatesTags: ['UserCourseProgress'],
      async onQueryStarted({ userId, courseId, progressData }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          api.util.updateQueryData('getUserCourseProgress', { userId, courseId }, (draft) => {
            Object.assign(draft, {
              ...draft,
              sections: progressData.sections,
            });
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useUpdateUserMutation,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useGetCoursesQuery,
  useGetCourseQuery,
  useGetUploadVideoUrlMutation,
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useCreateStripePaymentIntentMutation,
  useGetUserEnrolledCoursesQuery,
  useGetUserCourseProgressQuery,
  useUpdateUserCourseProgressMutation,
} = api;
