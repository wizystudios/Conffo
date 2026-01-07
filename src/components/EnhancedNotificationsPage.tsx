import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash2, ArrowLeft, MessageCircle, Heart, UserPlus, Settings, Clock, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { markAllNotificationsAsRead, getUserNotifications, deleteNotification, getNotificationSender } from '@/utils/notificationUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NotificationItemProps {
  notification: any;
  onNavigateToChat: (userId: string) => void;
}

const NotificationItem = ({ notification, onNavigateToChat }: NotificationItemProps) => {
  const navigate = useNavigate();
  
  const getNotificationIcon = () => {
    if (notification.type === 'message') return <MessageCircle className="h-4 w-4 text-white" />;
    if (notification.type === 'new_reaction' || notification.type === 'like') return <Heart className="h-4 w-4 text-white" />;
    if (notification.type === 'follow') return <UserPlus className="h-4 w-4 text-white" />;
    if (notification.type === 'new_comment') return <MessageCircle className="h-4 w-4 text-white" />;
    return <Bell className="h-4 w-4 text-white" />;
  };

  const handleClick = () => {
    if (notification.type === 'message' && notification.senderInfo?.userId) {
      onNavigateToChat(notification.senderInfo.userId);
    } else if ((notification.type === 'new_reaction' || notification.type === 'new_comment') && notification.related_id) {
      navigate(`/confession/${notification.related_id}`);
    } else if (notification.type === 'follow' && notification.senderInfo?.userId) {
      navigate(`/profile/${notification.senderInfo.userId}`);
    }
  };

  const isClickable = (notification.type === 'message' && notification.senderInfo?.userId) ||
    ((notification.type === 'new_reaction' || notification.type === 'new_comment') && notification.related_id) ||
    (notification.type === 'follow' && notification.senderInfo?.userId);

  const getTypeLabel = () => {
    if (notification.type === 'message') return 'NEW MESSAGE';
    if (notification.type === 'new_reaction' || notification.type === 'like') return 'NEW LIKE';
    if (notification.type === 'follow') return 'NEW FOLLOWER';
    if (notification.type === 'new_comment') return 'NEW COMMENT';
    return 'NOTIFICATION';
  };

  return (
    <div 
      className={`mx-4 my-3 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md ${
        isClickable ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
      style={{
        background: 'linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--background)) 100%)'
      }}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            {!notification.is_read && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-foreground">
                {notification.senderInfo?.username && notification.senderInfo.username !== 'Someone' 
                  ? notification.senderInfo.username 
                  : 'New Message'}
              </h3>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="text-[10px]">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: false })}
                </span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
              {notification.type === 'new_reaction' && 'reacted to your post'}
              {notification.type === 'new_comment' && 'commented on your post'}
              {notification.type === 'follow' && 'started following you'}
              {notification.type === 'message' && 'You have a new message'}
              {!['new_reaction', 'new_comment', 'follow', 'message'].includes(notification.type) && notification.content}
            </p>
            
            {/* Badge */}
            <Badge 
              variant="secondary" 
              className="text-[10px] px-2 py-0.5 bg-foreground text-background rounded-full font-semibold"
            >
              {getTypeLabel()}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EnhancedNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const notifs = await getUserNotifications(user.id, false);
      
      const enhancedNotifs = await Promise.all(notifs.map(async (notification) => {
        const senderInfo = await getNotificationSender(notification);
        return {
          ...notification,
          senderInfo
        };
      }));
      
      return enhancedNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });
  
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transform = 'translateY(-20px)';
      containerRef.current.style.opacity = '0';
      
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
          containerRef.current.style.transform = 'translateY(0)';
          containerRef.current.style.opacity = '1';
        }
      });
    }
  }, []);
  
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;
  
  const handleMarkNotificationsAsRead = async () => {
    if (!user?.id || unreadNotificationsCount === 0) return;
    
    await markAllNotificationsAsRead(user.id);
    toast({
      description: "All notifications marked as read"
    });
    
    refetchNotifications();
  };
  
  const handleDeleteAllNotifications = async () => {
    if (!user?.id || notifications.length === 0) return;
    
    for (const notification of notifications) {
      await deleteNotification(notification.id);
    }
    
    toast({
      description: "All notifications cleared"
    });
    
    refetchNotifications();
  };

  const handleNavigateToChat = (userId: string) => {
    navigate(`/chat/${userId}`);
  };

  return (
    <Layout>
      <div ref={containerRef} className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <h1 className="text-lg font-bold">Notifications</h1>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-4 py-2">
            {unreadNotificationsCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMarkNotificationsAsRead}
                className="h-8 text-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDeleteAllNotifications}
              className="h-8 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear all
            </Button>
          </div>
        )}
        
        {/* Content */}
        <div className="pb-20">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNavigateToChat={handleNavigateToChat}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <Bell className="h-16 w-16 text-muted-foreground/50" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping"></div>
              </div>
              <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                You're all up to date. When you get likes, comments, messages, or follows, they'll appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}