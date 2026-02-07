import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash2, ArrowLeft, MessageCircle, Heart, UserPlus, Settings, AtSign } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { markAllNotificationsAsRead, getUserNotifications, deleteNotification, getNotificationSender, markNotificationAsRead } from '@/utils/notificationUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// No filter - show all notifications

interface NotificationItemProps {
  notification: any;
  onNavigateToChat: (userId: string, messageId?: string) => void;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem = ({ notification, onNavigateToChat, onMarkAsRead }: NotificationItemProps) => {
  const navigate = useNavigate();
  
  const getNotificationIcon = () => {
    if (notification.type === 'message') return <MessageCircle className="h-4 w-4 text-primary-foreground" />;
    if (notification.type === 'new_reaction' || notification.type === 'like') return <Heart className="h-4 w-4 text-primary-foreground" />;
    if (notification.type === 'follow') return <UserPlus className="h-4 w-4 text-primary-foreground" />;
    if (notification.type === 'new_comment') return <MessageCircle className="h-4 w-4 text-primary-foreground" />;
    if (notification.type === 'mention') return <AtSign className="h-4 w-4 text-primary-foreground" />;
    return <Bell className="h-4 w-4 text-primary-foreground" />;
  };

  const handleClick = async () => {
    // Mark as read on click
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'message' && notification.senderInfo?.userId) {
      if (notification.related_id) {
        onNavigateToChat(notification.senderInfo.userId, notification.related_id);
      } else {
        onNavigateToChat(notification.senderInfo.userId);
      }
    } else if ((notification.type === 'new_reaction' || notification.type === 'new_comment' || notification.type === 'mention') && notification.related_id) {
      navigate(`/confession/${notification.related_id}`);
    } else if (notification.type === 'follow' && notification.senderInfo?.userId) {
      navigate(`/user/${notification.senderInfo.userId}`);
    } else if (notification.type === 'community' && notification.related_id) {
      navigate('/chat');
    }
  };

  const isClickable = (notification.type === 'message' && notification.senderInfo?.userId) ||
    ((notification.type === 'new_reaction' || notification.type === 'new_comment' || notification.type === 'mention') && notification.related_id) ||
    (notification.type === 'follow' && notification.senderInfo?.userId);

  const getTypeLabel = () => {
    if (notification.type === 'message') return 'MESSAGE';
    if (notification.type === 'new_reaction' || notification.type === 'like') return 'LIKE';
    if (notification.type === 'follow') return 'FOLLOWER';
    if (notification.type === 'new_comment') return 'REPLY';
    if (notification.type === 'mention') return 'MENTION';
    if (notification.type === 'community') return 'COMMUNITY';
    return 'UPDATE';
  };

  const getIconBgColor = () => {
    if (notification.type === 'message') return 'bg-blue-500';
    if (notification.type === 'new_reaction' || notification.type === 'like') return 'bg-red-500';
    if (notification.type === 'follow') return 'bg-green-500';
    if (notification.type === 'new_comment') return 'bg-purple-500';
    if (notification.type === 'mention') return 'bg-orange-500';
    return 'bg-primary';
  };

  return (
    <div 
      className={`mx-4 my-1.5 rounded-xl overflow-hidden transition-all duration-200 ${
        isClickable ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${notification.is_read ? 'opacity-60' : ''}`}
      onClick={handleClick}
    >
      <div className="p-2.5 flex items-center gap-2.5 bg-card border border-border/50 hover:border-border rounded-xl">
        {/* Icon */}
        <div className={`h-9 w-9 rounded-full ${getIconBgColor()} flex items-center justify-center flex-shrink-0`}>
          {getNotificationIcon()}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-[10px] text-foreground truncate">
              {notification.senderInfo?.username && notification.senderInfo.username !== 'Someone' 
                ? notification.senderInfo.username 
                : 'Someone'}
            </span>
            <Badge 
              variant="secondary" 
              className="text-[8px] px-1 py-0 h-3.5 bg-muted text-muted-foreground rounded font-medium"
            >
              {getTypeLabel()}
            </Badge>
          </div>
          
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            {notification.type === 'new_reaction' && 'liked your confession'}
            {notification.type === 'new_comment' && 'replied to your confession'}
            {notification.type === 'follow' && 'started following you'}
            {notification.type === 'message' && 'sent you a message'}
            {notification.type === 'mention' && 'mentioned you'}
            {notification.type === 'community' && 'new community message'}
            {!['new_reaction', 'new_comment', 'follow', 'message', 'community', 'mention'].includes(notification.type) && notification.content}
          </p>
        </div>
        
        {/* Time */}
        <div className="flex-shrink-0 text-[9px] text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: false })}
        </div>
        
        {/* Unread dot */}
        {!notification.is_read && (
          <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
      </div>
    </div>
  );
};

export default function EnhancedNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [filter] = useState('all');
  
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

  // Show all notifications - no filtering
  const filteredNotifications = notifications;
  
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

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    refetchNotifications();
    queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
  };

  const handleNavigateToChat = (userId: string, messageId?: string) => {
    if (messageId) {
      navigate(`/chat/${userId}?messageId=${messageId}`);
    } else {
      navigate(`/chat/${userId}`);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-background lg:flex lg:items-start lg:justify-center lg:pt-6">
      <div className="w-full lg:w-[500px] lg:max-w-[90vw] lg:bg-card lg:rounded-2xl lg:border lg:border-border lg:shadow-lg lg:overflow-hidden lg:max-h-[90vh] lg:flex lg:flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background lg:bg-card">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="text-sm font-semibold">Notifications</h1>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/notification-settings')}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Actions */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-end gap-1.5 px-4 py-1 border-b border-border/30">
          {unreadNotificationsCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkNotificationsAsRead}
              className="h-6 text-[10px] px-2"
            >
              <Check className="h-3 w-3 mr-0.5" />
              Mark read
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDeleteAllNotifications}
            className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-0.5" />
            Clear
          </Button>
        </div>
      )}
      
      {/* Content */}
      <div className="pb-20">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onNavigateToChat={handleNavigateToChat}
              onMarkAsRead={handleMarkAsRead}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative mb-4">
              <Bell className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <h2 className="text-sm font-semibold mb-1">All caught up!</h2>
            <p className="text-[10px] text-muted-foreground text-center max-w-sm">
              When you get likes, replies, messages, or follows, they'll appear here.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}