import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Check, Trash2, ArrowLeft, MessageCircle, Heart, UserPlus, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { markAllNotificationsAsRead, getUserNotifications, deleteNotification, getNotificationSender } from '@/utils/notificationUtils';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NotificationItemProps {
  notification: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  onNavigateToChat: (userId: string) => void;
}

const NotificationItem = ({ notification, isSelected, onToggleSelect, onNavigateToChat }: NotificationItemProps) => {
  const navigate = useNavigate();
  
  const getNotificationIcon = () => {
    if (notification.type === 'message') return <MessageCircle className="h-5 w-5 text-blue-500" />;
    if (notification.type === 'new_reaction' || notification.type === 'like') return <Heart className="h-5 w-5 text-red-500" />;
    if (notification.type === 'follow') return <UserPlus className="h-5 w-5 text-green-500" />;
    if (notification.type === 'new_comment') return <MessageCircle className="h-5 w-5 text-primary" />;
    return <Bell className="h-5 w-5 text-muted-foreground" />;
  };

  const handleClick = () => {
    if (notification.type === 'message' && notification.senderInfo?.userId) {
      onNavigateToChat(notification.senderInfo.userId);
    } else if ((notification.type === 'new_reaction' || notification.type === 'new_comment') && notification.related_id) {
      // Navigate to the confession/post
      navigate(`/confession/${notification.related_id}`);
    } else if (notification.type === 'follow' && notification.senderInfo?.userId) {
      // Navigate to the follower's profile
      navigate(`/profile/${notification.senderInfo.userId}`);
    }
  };

  const isClickable = (notification.type === 'message' && notification.senderInfo?.userId) ||
    ((notification.type === 'new_reaction' || notification.type === 'new_comment') && notification.related_id) ||
    (notification.type === 'follow' && notification.senderInfo?.userId);

  return (
    <div 
      className={`p-3 hover:bg-muted/50 relative transition-colors ${
        !notification.is_read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      } ${isClickable ? 'cursor-pointer' : ''}`}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4"
          />
        </div>
        
        <div className="flex-shrink-0">
          {notification.senderInfo?.userId ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${notification.senderInfo.userId}`} />
              <AvatarFallback className="text-xs">
                {(notification.senderInfo.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              {getNotificationIcon()}
            </div>
          )}
        </div>
        
        <div className="flex-grow min-w-0">
          <p className="text-xs break-words line-clamp-2">
            {notification.senderInfo?.username && notification.senderInfo.username !== 'Someone' ? (
              <>
                <span className="font-semibold">{notification.senderInfo.username}</span>
                {' '}
                {notification.type === 'new_reaction' && 'reacted to your confession'}
                {notification.type === 'new_comment' && 'commented on your confession'}
                {notification.type === 'follow' && 'started following you'}
                {notification.type === 'message' && notification.content}
              </>
            ) : (
              notification.content
            )}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
            {!notification.is_read && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EnhancedNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const notifs = await getUserNotifications(user.id, false);
      
      // Enhance with sender info if available
      const enhancedNotifs = await Promise.all(notifs.map(async (notification) => {
        const senderInfo = await getNotificationSender(notification);
        return {
          ...notification,
          senderInfo
        };
      }));
      
      // Sort by created_at desc
      return enhancedNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Check for new notifications every 10 seconds
  });
  
  useEffect(() => {
    // Smooth entrance animation
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

  const handleDeleteSelectedNotifications = async () => {
    if (selectedNotifications.length === 0) return;
    
    for (const notificationId of selectedNotifications) {
      await deleteNotification(notificationId);
    }
    
    toast({
      description: `Deleted ${selectedNotifications.length} notification${selectedNotifications.length > 1 ? 's' : ''}`
    });
    
    setSelectedNotifications([]);
    refetchNotifications();
  };

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(notifId => notifId !== id)
        : [...prev, id]
    );
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
      <div ref={containerRef} className="min-h-screen bg-gradient-to-b from-background to-background/95">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full hover:bg-muted/50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <Bell className="h-6 w-6 text-primary" />
                  {unreadNotificationsCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 text-xs animate-pulse">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </Badge>
                  )}
                </div>
                <h1 className="text-xl font-bold">Notifications</h1>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/notification-settings')}
                className="rounded-full hover:bg-muted/50"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
            
            {notifications.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                {unreadNotificationsCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleMarkNotificationsAsRead}
                    className="h-8 px-3 text-xs rounded-full"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDeleteAllNotifications}
                  className="h-8 px-3 text-xs rounded-full"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
            
            {selectedNotifications.length > 0 && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                <span className="text-sm text-muted-foreground">
                  {selectedNotifications.length} selected
                </span>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteSelectedNotifications}
                  className="h-7 text-xs rounded-full"
                >
                  Delete selected
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="max-w-lg mx-auto">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isSelected={selectedNotifications.includes(notification.id)}
                  onToggleSelect={() => toggleNotificationSelection(notification.id)}
                  onNavigateToChat={handleNavigateToChat}
                />
              ))}
            </div>
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