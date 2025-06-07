'use client';

import { Bell, BookOpen } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import UserProfileButton from '@/components/UserProfileButton';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuthStore } from '@/stores/authStore';

const Navbar = ({ isCoursePage }: { isCoursePage: boolean }) => {
  const { user } = useAuthStore();
  const userRole = user?.role || 'USER';

  return (
    <nav className="dashboard-navbar">
      <div className="dashboard-navbar__container">
        <div className="dashboard-navbar__search">
          <div className="md:hidden">
            <SidebarTrigger className="dashboard-navbar__sidebar-trigger" />
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Link
                href="/search"
                className={cn('dashboard-navbar__search-input', {
                  '!bg-customgreys-secondarybg': isCoursePage,
                })}
                scroll={false}
              >
                <span className="hidden sm:inline">Search Courses</span>
                <span className="sm:hidden">Search</span>
              </Link>
              <BookOpen className="dashboard-navbar__search-icon" size={18} />
            </div>
          </div>
        </div>

        <div className="dashboard-navbar__actions flex items-center gap-2">
          <button className="nondashboard-navbar__notification-button">
            <span className="nondashboard-navbar__notification-indicator"></span>
            <Bell className="nondashboard-navbar__notification-icon" />
          </button>

          {/* 테마 토글 버튼 - UserProfileButton 옆에 배치 */}
          <ThemeToggle className="ml-2" />

          <UserProfileButton userProfileUrl={userRole === 'USER' ? '/user/profile' : '/teacher/profile'} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
