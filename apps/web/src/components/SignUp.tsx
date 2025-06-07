'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser, loginUser } from '@/services/authService';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // 이메일/비밀번호 회원가입
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccess('');

    const res = await registerUser(email, password);
    console.log(res);
    if (res?.errors?.length > 0) {
      console.log(res.errors);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setErrors(res?.errors?.map((err: any) => err.message));
      return;
    }

    setSuccess('Sign-up successful! Redirecting to the dashboard...');
    if (res?.success) {
      // 회원가입 후 자동 로그인 처리
      const loginRes = await loginUser(email, password);
      if (loginRes?.success) {
        setTimeout(() => {
          router.push('/user/courses'); // 로그인 성공 후 대시보드로 리디렉션
        }, 500);
      }
    }
  };

  // 회원가입 전체 wrapper - 테마 변수 적용
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6">
      {/* 회원가입 카드 wrapper - 테마 변수 적용 */}
      <div className="w-full max-w-md bg-card text-card-foreground p-8 rounded-lg shadow-lg flex flex-col items-center">
        {/* 회원가입 타이틀 - 테마 변수 적용 */}
        <h2 className="text-3xl font-bold text-center">Sign Up</h2>

        {/* 에러 메시지 - 테마 변수 적용 */}
        {errors.length > 0 && (
          <Alert variant="destructive" className="mt-4 text-sm text-destructive text-center">
            <ul className="list-disc list-inside">
              {errors.map((errMsg, index) => (
                <li key={index}>{errMsg}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* 성공 메시지 - 테마 변수 적용 */}
        {success && (
          <Alert variant="default" className="mt-4 text-sm text-success text-center">
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 w-full">
          <div>
            <label className="block text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-form__input mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-form__input mt-2"
            />
          </div>

          <Button
            type="submit"
            className="auth-form__button mt-4"
          >
            Sign Up
          </Button>
        </form>
        {/* 구분선 - 테마 변수 적용 */}
        <div className="flex items-center mt-6 w-full">
          <div className="flex-grow auth-form__divider"></div>
          <span className="mx-3 text-sm auth-form__divider-text">OR</span>
          <div className="flex-grow auth-form__divider"></div>
        </div>
        {/* 로그인 페이지로 이동 - 카드 내부 하단에 배치 */}
        <div className="mt-6 text-center w-full">
          <Link href="/signin" className="auth-form__link">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
