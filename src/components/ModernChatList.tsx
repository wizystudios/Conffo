import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface ChatUser {
  id: string;
  username: string;
  avatar_url: string | null;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  isOnline?: boolean;
}

interface ModernChatListProps {
  users: ChatUser[];
}

export function ModernChatList({ users }: ModernChatListProps) {
  return (
    <div className="divide-y">
      {users.map((user) => (
        <Link 
          key={user.id} 
          to={`/chat/${user.id}`}
          className="block hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-4 p-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-white dark:border-gray-900">
                <AvatarImage 
                  src={user.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${user.id}`} 
                />
                <AvatarFallback className="text-base font-medium bg-gray-200">
                  {user.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {user.isOnline && (
                <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-semibold text-base truncate">
                  {user.username || 'Unknown User'}
                </span>
                {user.lastMessageTime && (
                  <span className="text-sm text-gray-500 flex-shrink-0 ml-2">
                    {formatDistanceToNow(user.lastMessageTime, { addSuffix: false })}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-500 truncate">
                {user.lastMessage 
                  ? user.lastMessage.length > 50 
                    ? `${user.lastMessage.slice(0, 50)}...`
                    : user.lastMessage
                  : 'No messages yet'}
              </p>
            </div>

            {user.unreadCount && user.unreadCount > 0 && (
              <div className="flex-shrink-0 ml-2">
                <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user.unreadCount > 9 ? '9+' : user.unreadCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
