import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string;
  successMessage: string;
  isLoading?: boolean;
}

export const SignInForm: React.FC<SignInFormProps> = ({ 
  onSubmit, 
  error, 
  successMessage, 
  isLoading = false 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      await onSubmit(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        {/* 이메일 라벨 - 테마 변수 적용 */}
        <Label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </Label>
        {/* 이메일 입력 - 테마 변수 적용 */}
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="auth-form__input mt-2"
          placeholder="이메일을 입력하세요"
        />
      </div>

      <div>
        {/* 비밀번호 라벨 - 테마 변수 적용 */}
        <Label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </Label>
        {/* 비밀번호 입력 - 테마 변수 적용 */}
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className="auth-form__input mt-2"
          placeholder="비밀번호를 입력하세요"
        />
      </div>

      {/* 에러 메시지 - 테마 변수 적용 */}
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
      
      {/* 성공 메시지 - 테마 변수 적용 */}
      {successMessage && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{successMessage}</p>}
      
      {/* 로그인 버튼 - 테마 변수 적용 */}
      <Button
        type="submit"
        disabled={isLoading}
        className="auth-form__button w-full"
      >
        {isLoading ? '로그인 중...' : 'Sign In'}
      </Button>
    </form>
  );
};
