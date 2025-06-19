'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthApiClient, TokenManager } from '@packages/auth';
import { loginSchema, type LoginDto } from '@packages/schemas';

// API Gateway URL 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
const authApi = new AuthApiClient(API_BASE_URL);

interface LoginFormProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export default function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginDto) => {
    setIsLoading(true);
    console.log('Login attempt:', { email: data.email, apiUrl: API_BASE_URL });

    try {
      const response = await authApi.login(data);
      console.log('Login response:', response);

      // 성공 응답 처리
      if (response && response.user && response.tokens) {
        console.log('성공 응답 데이터:', response);

        // 토큰 저장
        TokenManager.setTokens(
          response.tokens.accessToken,
          response.tokens.refreshToken
        );
        console.log('토큰 저장 완료');

        onSuccess?.(response);
        reset();
      } else {
        console.error('예상치 못한 응답 형식:', response);
        throw new Error('로그인에 실패했습니다');
      }
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });

      // 에러 메시지 추출
      let errorMessage = '로그인에 실패했습니다';

      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        // Zod validation 에러
        errorMessage = error.errors.map((err: any) => err.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }

      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="이메일을 입력하세요"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="비밀번호를 입력하세요"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}
