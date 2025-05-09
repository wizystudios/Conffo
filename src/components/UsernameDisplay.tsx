
import { User } from '@/types';

interface UsernameDisplayProps {
  user: Pick<User, 'username' | 'isAdmin'>;
  className?: string;
}

export function UsernameDisplay({ user, className = '' }: UsernameDisplayProps) {
  return (
    <span className={`font-medium ${className} ${user.isAdmin ? 'text-primary' : ''}`}>
      {user.username || 'Anonymous'}
      {user.isAdmin && ' (Admin)'}
    </span>
  );
}
