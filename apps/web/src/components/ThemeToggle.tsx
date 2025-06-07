"use client";

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  // ThemeContext에서 테마 상태와 토글 함수 가져오기
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 토글 버튼 클릭 핸들러
  const handleToggleTheme = () => {
    console.log('현재 테마:', theme); // 디버깅용
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggleTheme}
      className={`
        rounded-full flex items-center justify-center p-2
        transition-colors duration-200
        ${className}
      `}
      aria-label={`테마 변경: ${theme === 'light' ? '다크' : '라이트'} 모드로 전환`}
    >
      {/* 현재 테마에 따라 다른 아이콘 표시 */}
      {theme === 'light' ? (
        <Moon className="cursor-pointer text-customgreys-dirtyGrey w-5 h-5 sm:w-6 sm:h-6 hover:text-white-50" />
      ) : (
        <Sun className="cursor-pointer text-customgreys-dirtyGrey w-5 h-5 sm:w-6 sm:h-6 hover:text-white-50" />
      )}
    </button>
  );
};

export default ThemeToggle;