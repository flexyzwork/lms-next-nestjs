import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';

const UserProfileButton = (props: { userProfileUrl: string }) => {
  const { user } = useAuthStore();
  const { userProfileUrl } = props;

  return (
    <div className="relative">
      <Link href={`${userProfileUrl}`} className="flex items-center space-x-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatar ?? ''} alt="Profile" />
          <AvatarFallback>{user?.username?.charAt(0) ?? 'U'}</AvatarFallback>
        </Avatar>
        <span className="text-white sm:hidden">
          {user?.username?.charAt(0) ?? 'U'}
        </span>
        <span className="text-white hidden sm:inline">{user?.username}</span>
      </Link>
    </div>
  );
};

export default UserProfileButton;
