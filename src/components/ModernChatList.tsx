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
    <div className="divide-y divide-border/50">
      {users.map((user) => (
        <Link 
          key={user.id} 
          to={`/chat/${user.id}`}
          className="block hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 p-2">
            <div className="relative">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage 
                  src={user.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${user.id}`} 
                />
                <AvatarFallback className="text-xs font-medium">
                  {user.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {user.isOnline && (
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border border-background" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-0.5">
                <span className="font-semibold text-xs truncate">
                  {user.username || 'Unknown User'}
                </span>
                {user.lastMessageTime && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-1">
                    {formatDistanceToNow(user.lastMessageTime, { addSuffix: false })}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground truncate">
                {user.lastMessage 
                  ? user.lastMessage.length > 40 
                    ? `${user.lastMessage.slice(0, 40)}...`
                    : user.lastMessage
                  : 'No messages yet'}
              </p>
            </div>

            {user.unreadCount && user.unreadCount > 0 && (
              <div className="flex-shrink-0 ml-1">
                <div className="h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">
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
