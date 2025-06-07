'use client';

import React, { useState, useEffect } from 'react';
import { PasswordValidator } from '@packages/auth';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export default function PasswordStrengthIndicator({ 
  password, 
  className = "" 
}: PasswordStrengthIndicatorProps) {
  const [strengthData, setStrengthData] = useState<any>(null);

  useEffect(() => {
    if (password) {
      const data = PasswordValidator.validateStrength(password);
      setStrengthData(data);
    } else {
      setStrengthData(null);
    }
  }, [password]);

  if (!strengthData) return null;

  const getProgressColor = () => {
    switch (strengthData.strength) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getProgressWidth = () => {
    return `${(strengthData.score / 5) * 100}%`;
  };

  return (
    <div className={`mt-2 ${className}`}>
      {/* 진행률 바 */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: getProgressWidth() }}
        />
      </div>
      
      {/* 강도 텍스트 */}
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm text-gray-600">비밀번호 강도:</span>
        <span className={`text-sm font-medium ${PasswordValidator.getStrengthColor(strengthData.strength)}`}>
          {PasswordValidator.getStrengthText(strengthData.strength)}
        </span>
      </div>

      {/* 체크리스트 */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.length ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.length ? 'text-green-600' : 'text-gray-500'}`}>
            8자 이상
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.lowercase ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
            소문자 포함
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.uppercase ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
            대문자 포함
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.numbers ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.numbers ? 'text-green-600' : 'text-gray-500'}`}>
            숫자 포함
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.symbols ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.symbols ? 'text-green-600' : 'text-gray-500'}`}>
            특수문자 포함
          </span>
        </div>
      </div>

      {/* 제안사항 */}
      {strengthData.suggestions.length > 0 && (
        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-xs text-yellow-800 font-medium mb-1">개선 제안:</p>
          <ul className="text-xs text-yellow-700 space-y-1">
            {strengthData.suggestions.map((suggestion: string, index: number) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
