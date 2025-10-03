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
    <div className="space-y-1">
      {users.map((user) => (
        <Link 
          key={user.id} 
          to={`/chat/${user.id}`}
          className="block hover:bg-muted/50 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3 p-3">
            <div className="relative">
              <Avatar className="h-14 w-14 ring-2 ring-background">
                <AvatarImage 
                  src={user.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${user.id}`} 
                />
                <AvatarFallback className="text-sm font-medium">
                  {user.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {user.isOnline && (
                <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold text-sm truncate">
                  {user.username || 'Unknown User'}
                </span>
                {user.lastMessageTime && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(user.lastMessageTime, { addSuffix: false })}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground truncate">
                {user.lastMessage || 'Start a conversation'}
              </p>
            </div>

            {user.unreadCount && user.unreadCount > 0 && (
              <div className="flex-shrink-0 ml-2">
                <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">
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
