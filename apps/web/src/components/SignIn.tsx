'use client';

import { SignInForm } from '@/components/SignInForm';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/services/authService';
import Link from 'next/link';

export default function SignInComponent() {
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (email: string, password: string) => {
    setError('');
    setIsLoading(true);
    
    try {
      const res = await loginUser(email, password);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setSuccessMessage('로그인 성공! 페이지를 이동합니다...');
        console.log('✅ 로그인 완료, 사용자 정보:', res.user);
        
        // 짧은 지연 후 리다이렉트 (사용자가 성공 메시지를 볼 수 있도록)
        setTimeout(() => {
          router.push('/user/courses');
        }, 1000);
      }
    } catch (error) {
      console.error('❌ 로그인 처리 중 오류:', error);
      setError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <>
      {/* 인증 화면 전체 wrapper - 테마 변수 적용 */}
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6">
        {/* 인증 카드 wrapper - 테마 변수 적용 */}
        <div className="w-full max-w-md bg-card text-card-foreground p-8 rounded-lg shadow-lg">
          {/* 인증 타이틀 - 테마 변수 적용 */}
          <h2 className="text-3xl font-bold text-center mb-4">Sign In</h2>

          <SignInForm 
            onSubmit={handleSubmit} 
            error={error} 
            successMessage={successMessage}
            isLoading={isLoading}
          />

          <div className="flex items-center mt-6">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="mx-3 text-sm auth-form__divider-text">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>

          <SocialLoginButtons onSocialLogin={handleSocialLogin} />

          {/* 사인업 페이지로 이동 */}
          <div className="mt-6 text-center">
            <Link href="/signup" className="auth-form__link">
              New here? Create an account!
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
