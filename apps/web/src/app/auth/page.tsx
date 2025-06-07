'use client';

import React, { useState } from 'react';
import { LoginForm, RegisterForm } from '@/components/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAuthSuccess = (response: any) => {
    console.log('Auth success response:', response);
    
    const message = response?.message || '성공적으로 완료되었습니다';
    toast.success(message);
    
    if (activeTab === 'login') {
      // 로그인 성공 시 대시보드로 이동
      router.push('/dashboard');
    } else {
      // 회원가입 성공 시 로그인 탭으로 전환
      setActiveTab('login');
      toast.info('이제 로그인할 수 있습니다');
    }
  };

  const handleAuthError = (error: string) => {
    console.error('Auth error:', error);
    toast.error(error || '알 수 없는 오류가 발생했습니다');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {activeTab === 'login' ? '로그인' : '회원가입'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {activeTab === 'login' ? '계정에 로그인하세요' : '새 계정을 만드세요'}
          </p>
        </div>

        {/* 탭 전환 */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'login'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'register'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 폼 컨테이너 */}
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {activeTab === 'login' ? (
            <LoginForm 
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
            />
          ) : (
            <RegisterForm 
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
            />
          )}
        </div>

        {/* 추가 링크 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {activeTab === 'login' ? (
              <>
                계정이 없으신가요?{' '}
                <button
                  onClick={() => setActiveTab('register')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{' '}
                <button
                  onClick={() => setActiveTab('login')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  로그인
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
