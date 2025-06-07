'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

function AuthCallbackHandler() {
  const { login } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam)); // ✅ JSON 복원
        login(user, token); // ✅ Zustand에 저장

        const { accessToken, user: savedUser } = useAuthStore.getState();
        console.log('✅ accessToken:', accessToken);
        console.log('✅ savedUser:', savedUser);

        setTimeout(() => {
          router.replace('/user/courses'); // ✅ 로그인 후 대시보드로 이동 (1초 딜레이)
        }, 1000);
      } catch (error) {
        console.error('❌ 유저 정보 파싱 오류:', error);
        router.replace('/login'); // 오류 발생 시 로그인 페이지로 이동
      }
    } else {
      router.replace('/login'); // 토큰이 없으면 로그인 페이지로 이동
    }
  }, [searchParams, login, router]);

  return <p className="text-center mt-10">로그인 중...</p>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="text-center mt-10">OAuth 처리 중...</p>}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
