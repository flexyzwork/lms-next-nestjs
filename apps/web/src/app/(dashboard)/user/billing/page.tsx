'use client';

import Loading from '@/components/Loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils';
import { useGetTransactionsQuery } from '@/state/api';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

import React, { useState, useEffect } from 'react';

const UserBilling = () => {
  const [paymentType, setPaymentType] = useState('all');
  const { user } = useAuthStore();
  const router = useRouter();

  // 디버깅을 위한 사용자 정보 로깅
  useEffect(() => {
    console.log('🔍 UserBilling 페이지 - 현재 사용자 정보:', {
      user,
      userId: user?.userId,
      id: user?.id,
      email: user?.email
    });
  }, [user]);

  const { 
    data: transactions, 
    isLoading: isLoadingTransactions, 
    isError,
    error 
  } = useGetTransactionsQuery(user?.userId || '', {
    skip: !user?.userId, // userId가 없으면 쿼리 건너뛰기
  });

  // 오류 상세 로깅
  useEffect(() => {
    if (isError) {
      console.error('❌ getTransactions 오류:', error);
    }
  }, [isError, error]);

  const filteredData =
    transactions?.filter((transaction) => {
      const matchesTypes = paymentType === 'all' || transaction.paymentProvider === paymentType;
      return matchesTypes;
    }) || [];

  if (!user) {
    console.log('⚠️ 사용자 정보가 없음 - 로그인 페이지로 리다이렉트');
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">로그인이 필요합니다</h2>
        <p className="text-muted-foreground">결제 내역을 보려면 로그인해주세요.</p>
        <button 
          onClick={() => router.push('/signin')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          로그인하기
        </button>
      </div>
    );
  }

  if (!user.userId) {
    console.log('⚠️ userId가 없음:', user);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">사용자 정보 오류</h2>
        <p className="text-muted-foreground">사용자 정보에 문제가 있습니다. 다시 로그인해주세요.</p>
        <button 
          onClick={() => router.push('/signin')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          다시 로그인하기
        </button>
      </div>
    );
  }

  if (isError) {
    console.error('❌ 결제 내역 로딩 오류:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">결제 내역을 불러올 수 없습니다</h2>
        <p className="text-muted-foreground">네트워크 오류가 발생했습니다. 페이지를 새로고침해주세요.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div className="billing">
      <div className="billing__container">
        <h2 className="billing__title">Payment History</h2>
        <div className="billing__filters">
          <Select value={paymentType} onValueChange={setPaymentType}>
            <SelectTrigger className="billing__select">
              <SelectValue placeholder="Payment Type" />
            </SelectTrigger>

            <SelectContent className="billing__select-content">
              <SelectItem className="billing__select-item" value="all">
                All Types
              </SelectItem>
              <SelectItem className="billing__select-item" value="stripe">
                Stripe
              </SelectItem>
              <SelectItem className="billing__select-item" value="paypal">
                Paypal
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="billing__grid">
          {isLoadingTransactions ? (
            <Loading />
          ) : (
            <Table className="billing__table">
              <TableHeader className="billing__table-header">
                <TableRow className="billing__table-header-row">
                  <TableHead className="billing__table-cell">Date</TableHead>
                  <TableHead className="billing__table-cell">Amount</TableHead>
                  <TableHead className="billing__table-cell">Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="billing__table-body">
                {filteredData.length > 0 ? (
                  filteredData.map((transaction) => (
                    <TableRow className="billing__table-row" key={transaction.transactionId}>
                      <TableCell className="billing__table-cell">
                        {new Date(transaction.dateTime).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="billing__table-cell billing__amount">
                        {formatPrice(transaction.amount)}
                      </TableCell>
                      <TableCell className="billing__table-cell">{transaction.paymentProvider}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="billing__table-row">
                    <TableCell className="billing__table-cell text-center" colSpan={3}>
                      No transactions to display
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserBilling;
