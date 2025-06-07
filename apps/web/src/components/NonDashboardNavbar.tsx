'use client';

import { useAuthStore } from '@/stores/authStore';
import { Bell, BookOpen } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { logoutUser } from '@/services/authService';
import UserProfileButton from '@/components/UserProfileButton';
import ThemeToggle from '@/components/ThemeToggle';

const NonDashboardNavbar = () => {
  const { user } = useAuthStore();

  const userRole = user?.role as 'USER' | 'INSTRUCTOR';
  const profilePath = userRole === 'USER' ? '/user/profile' : '/teacher/profile';

  return (
    <nav className="nondashboard-navbar">
      <div className="nondashboard-navbar__container">
        <div className="nondashboard-navbar__search">
          <Link href="/" className="nondashboard-navbar__brand" scroll={false}>
            FLEXYZ
          </Link>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Link href="/search" className="nondashboard-navbar__search-input" scroll={false}>
                <span className="hidden sm:inline">Search Courses</span>
                <span className="sm:hidden">Search</span>
              </Link>
              <BookOpen className="nondashboard-navbar__search-icon" size={18} />
            </div>
            <ThemeToggle className="navbar__dark-mode-button" />
          </div>
        </div>
        <div className="nondashboard-navbar__actions">
          <button className="nondashboard-navbar__notification-button">
            <span className="nondashboard-navbar__notification-indicator"></span>
            <Bell className="nondashboard-navbar__notification-icon" />
          </button>

          {user && (
            <>
              <UserProfileButton userProfileUrl={profilePath} />
              <button className="nondashboard-navbar__auth-button--logout" onClick={logoutUser}>
                Log out
              </button>
            </>
          )}
          {!user && (
            <>
              <Link href="/signin" className="nondashboard-navbar__auth-button--login" scroll={false}>
                Log in
              </Link>
              <Link href="/signup" className="nondashboard-navbar__auth-button--signup" scroll={false}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NonDashboardNavbar;
