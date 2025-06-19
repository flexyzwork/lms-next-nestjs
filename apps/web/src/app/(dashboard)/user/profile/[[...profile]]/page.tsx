'use client';

import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PencilIcon } from 'lucide-react';
import Header from '@/components/Header';
import { useAuthStore } from '@/stores/authStore';
import { updateProfile } from '@/services/authService';

const UserProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState('');

  useEffect(() => {
    if (user?.username) {
      setName(user.username);
    }
  }, [user?.username]);

  // ✅ 이름 입력값 업데이트
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  // ✅ 프로필 업데이트 API 호출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      console.log('🔄 프로필 업데이트 시도:', { username: name });
      
      const updatedUser = await updateProfile({ username: name });
      
      // 사용자 정보가 자동으로 업데이트됨 (authService에서 처리)
      console.log('✅ 프로필 업데이트 완료:', updatedUser);
      
      alert('프로필이 성공적으로 업데이트되었습니다!');
    } catch (error) {
      console.error('❌ 프로필 업데이트 실패:', error);
      
      // 에러 메시지 처리
      const errorMessage = error instanceof Error 
        ? error.message 
        : '프로필 업데이트에 실패했습니다.';
        
      alert(errorMessage);
      
      // 인증 오류인 경우 로그인 페이지로 리다이렉트
      if (errorMessage.includes('다시 로그인해주세요')) {
        setTimeout(() => {
          window.location.href = '/signin';
        }, 2000);
      }
    }
  };

  return (
    <div className="user-courses">
      <Header title="My Profile" subtitle="View your enrolled courses" />
      <div className="user-courses__grid">
        <Card className="bg-background border-border shadow-lg">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg font-semibold text-foreground">Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* 프로필 이미지 및 정보 */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={user?.avatar ?? ''} alt="Profile" />
                  <AvatarFallback className="text-lg font-bold bg-muted text-muted-foreground">
                    {user?.username?.charAt(0) ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold text-foreground">{user?.username || 'No Name'}</h2>
                  <p className="text-muted-foreground">{user?.email || 'No Email'}</p>
                  <span className="text-muted-foreground bg-muted px-3 py-1 rounded-md text-sm inline-block">
                    {user?.role || 'USER'}
                  </span>
                </div>
              </div>

              {/* 프로필 편집 섹션 */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-foreground mb-2 block">Name</label>
                  <div className="relative">
                    <Input
                      type="text"
                      name="name"
                      value={name}
                      onChange={handleChange}
                      className="w-full pr-10 bg-background border-border text-foreground focus:border-primary focus:ring-primary"
                      required
                    />
                    <PencilIcon className="h-5 w-5 text-muted-foreground absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              {/* 저장 버튼 */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="default"
                  className="px-4 py-2 shadow-md w-36 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfilePage;
