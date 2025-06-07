'use client';

import Loading from '@/components/Loading';
import WizardStepper from '@/components/WizardStepper';
import { useCheckoutNavigation } from '@/hooks/useCheckoutNavigation';
import React, { useEffect, useState } from 'react';
import CheckoutDetailsPage from './details';
import PaymentPage from './payment';
import CompletionPage from './completion';
import { useAuthStore } from '@/stores/authStore';

const CheckoutWizard = () => {
  const { user } = useAuthStore();
  console.log('user', user);

  const [isLoaded, setIsLoaded] = useState(false);
  const { checkoutStep } = useCheckoutNavigation();

  useEffect(() => {
    // 유저 정보가 변경되면 로딩 완료 처리
    if (user !== undefined) {
      setIsLoaded(true);
    }
  }, [user]);
  if (!isLoaded) {
    return <Loading />;
  }

  if (isLoaded) {
    console.log('checkoutStep', checkoutStep);
    const renderStep = () => {
      switch (checkoutStep) {
        case 1:
          return <CheckoutDetailsPage />;
        case 2:
          return <PaymentPage />;
        case 3:
          return <CompletionPage />;
        default:
          return <CheckoutDetailsPage />;
      }
    };

    return (
      <div className="checkout">
        <WizardStepper currentStep={checkoutStep} />
        <div className="checkout__content">{renderStep()}</div>
      </div>
    );
  }
};

export default CheckoutWizard;
