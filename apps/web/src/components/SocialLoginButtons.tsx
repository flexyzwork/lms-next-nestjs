import { Button } from "@/components/ui/button";

interface SocialLoginButtonsProps {
  onSocialLogin: (provider: 'google' | 'github') => void;
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ onSocialLogin }) => {
  return (
    <div className="mt-6 space-y-3">
      {/* 구글 로그인 버튼 - 테마 변수 적용 */}
<Button
  onClick={() => onSocialLogin('google')}
  className="auth-form__button auth-form__button--google flex items-center justify-center"
>
        <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
          <path fill="currentColor" d="M24 19.6v8.8h12.2C34.9 35 30.3 38 24 38c-8.3 0-15-6.7-15-15s6.7-15 15-15c4.1 0 7.5 1.5 10.3 3.9l-4.6 4.6C27.9 14 26 13 24 13c-6 0-10.9 4.9-10.9 11s4.9 11 10.9 11c5.3 0 9.1-3.4 9.6-7.8H24z"></path>
        </svg>
        Continue with Google
      </Button>

      {/* 깃허브 로그인 버튼 - 테마 변수 적용 */}
      <Button
        onClick={() => onSocialLogin('github')}
        className="auth-form__button auth-form__button--github flex items-center justify-center bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.68c-2.78.6-3.36-1.34-3.36-1.34-.45-1.15-1.1-1.46-1.1-1.46-.9-.6.07-.6.07-.6 1 .07 1.52 1 1.52 1 .9 1.52 2.38 1.1 2.98.83.07-.67.34-1.1.62-1.34-2.22-.25-4.55-1.1-4.55-4.88a3.84 3.84 0 011.07-2.67 3.58 3.58 0 01.1-2.6s.83-.25 2.72 1a9.23 9.23 0 014.94 0c1.89-1.25 2.72-1 2.72-1a3.58 3.58 0 01.1 2.6 3.84 3.84 0 011.07 2.67c0 3.8-2.34 4.6-4.57 4.88.35.32.66.92.66 1.87v2.78c0 .26.17.58.68.48A10 10 0 0012 2"
          ></path>
        </svg>
        Continue with GitHub
      </Button>
    </div>
  );
};