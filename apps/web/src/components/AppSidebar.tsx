import { usePathname } from 'next/navigation';
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { BookOpen, Briefcase, DollarSign, LogOut, PanelLeft, User /*, Settings */ } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { logoutUser } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

const AppSidebar = () => {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  const navLinks = {
    USER: [
      { icon: BookOpen, label: 'Courses', href: '/user/courses' },
      { icon: Briefcase, label: 'Billing', href: '/user/billing' },
      { icon: User, label: 'Profile', href: '/user/profile' },
      // { icon: Settings, label: 'Settings', href: '/user/settings' },
    ],
    INSTRUCTOR: [
      { icon: BookOpen, label: 'Courses', href: '/teacher/courses' },
      { icon: DollarSign, label: 'Billing', href: '/teacher/billing' },
      { icon: User, label: 'Profile', href: '/teacher/profile' },
      // { icon: Settings, label: 'Settings', href: '/teacher/settings' },
    ],
  };

  if (!user) return <div>User not found</div>;

  const userType = (user?.role as 'USER' | 'INSTRUCTOR') || 'USER';
  console.log('userType', userType);
  const currentNavLinks = navLinks[userType];

  return (
    <Sidebar collapsible="icon" style={{ height: '100vh' }} className="bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 shadow-lg">
      <SidebarHeader>
        <SidebarMenu className="app-sidebar__menu">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => toggleSidebar()}
              className="group hover:bg-gray-100"
            >
              <div className="app-sidebar__logo-container group">
                <div className="app-sidebar__logo-wrapper">
                  <Image src="/logo.svg" alt="logo" width={25} height={20} className="app-sidebar__logo" />
                  <p className="app-sidebar__title text-gray-800 dark:text-gray-100">FLEXYZ</p>
                </div>
                <PanelLeft className="app-sidebar__collapse-icon text-gray-600 dark:text-gray-300" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="app-sidebar__nav-menu">
          {currentNavLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <SidebarMenuItem key={link.href} className={cn('app-sidebar__nav-item', isActive && 'bg-blue-50 dark:bg-slate-800 border-r-2 border-blue-500 dark:border-blue-400')}>
                <SidebarMenuButton
                  asChild
                  size="lg"
                  className={cn('app-sidebar__nav-button', !isActive && 'text-gray-600 dark:text-gray-300')}
                >
                  <Link href={link.href} className="app-sidebar__nav-link" scroll={false}>
                    <link.icon className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} />
                    <span className={cn('app-sidebar__nav-text', isActive ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300')}>
                      {link.label}
                    </span>
                  </Link>
                </SidebarMenuButton>
                {isActive && <div className="app-sidebar__active-indicator bg-blue-500 dark:bg-blue-400" />}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button onClick={() => logoutUser()} className="app-sidebar__signout text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-800">
                <LogOut className="mr-2 h-6 w-6" />
                <span>Sign out</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;