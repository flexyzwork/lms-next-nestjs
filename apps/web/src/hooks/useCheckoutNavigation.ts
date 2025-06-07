'use client';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
export const useCheckoutNavigation = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 유저 정보가 로딩되면 `isLoaded`를 true로 변경
    if (user !== undefined) {
      setIsLoaded(true);
    }
  }, [user]);

  const courseId = searchParams.get('id') ?? '';
  const isSignedIn = !!user;
  const checkoutStep = parseInt(searchParams.get('step') ?? '1', 10);

  const navigateToStep = useCallback(
    (step: number) => {
      const newStep = Math.min(Math.max(1, step), 3);
      const showSignUp = isSignedIn ? 'true' : 'false';

      router.push(`/checkout?step=${newStep}&id=${courseId}&showSignUp=${showSignUp}`, {
        scroll: false,
      });
    },
    [courseId, isSignedIn, router]
  );

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn && checkoutStep > 1) {
        // 로그인이 안 되어 있는데 step이 2 이상이면 1단계로 되돌림
        navigateToStep(1);
      } else if (isSignedIn && checkoutStep === 1) {
        // 로그인이 되어 있는데 1단계에 머물러 있으면 2단계로 이동
        navigateToStep(2);
      }
    }
  }, [isLoaded, isSignedIn, checkoutStep, navigateToStep]);

  return { checkoutStep, navigateToStep };
};