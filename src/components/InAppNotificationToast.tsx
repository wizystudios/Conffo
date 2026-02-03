import { useState, useEffect } from 'react';
import { X, MessageCircle, Heart, UserPlus, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showNotification, requestNotificationPermission } from '@/utils/pushNotifications';

interface ToastNotification {
  id: string;
  type: string;
  content: string;
  senderName?: string;
  senderAvatar?: string;
  relatedId?: string;
  senderId?: string;
}

export function InAppNotificationToast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<ToastNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('in-app-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newNotif = payload.new as any;
          
          // Get sender info if possible
          let senderName = 'Someone';
          let senderAvatar: string | undefined;
          let senderId: string | undefined;

          // Try to extract sender from content or related data
          if (newNotif.type === 'new_comment' || newNotif.type === 'new_reaction') {
            // These are from confession triggers
          } else if (newNotif.type === 'follow') {
            senderId = newNotif.related_id;
            if (senderId) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', senderId)
                .single();
              if (profile) {
                senderName = profile.username || 'Someone';
                senderAvatar = profile.avatar_url;
              }
            }
          }

          const toast: ToastNotification = {
            id: newNotif.id,
            type: newNotif.type,
            content: newNotif.content,
            senderName,
            senderAvatar,
            relatedId: newNotif.related_id,
            senderId
          };

          // Show in-app toast only when page is visible
          if (document.visibilityState === 'visible') {
            setNotification(toast);
            setIsVisible(true);
            
            // Auto-hide after 4 seconds
            setTimeout(() => setIsVisible(false), 4000);
          } else {
            // App is backgrounded - show browser notification
            showNotification(getNotificationTitle(newNotif.type), {
              body: newNotif.content,
              tag: `notif-${newNotif.id}`,
              onClick: () => handleNavigation(toast)
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'new_reaction':
        return 'New like on your confession';
      case 'new_comment':
        return 'New comment on your confession';
      case 'follow':
        return 'New follower';
      case 'message':
        return 'New message';
      default:
        return 'New notification';
    }
  };

  const getIcon = () => {
    if (!notification) return <Bell className="h-4 w-4" />;
    switch (notification.type) {
      case 'new_reaction':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'new_comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const handleNavigation = (notif: ToastNotification) => {
    if (notif.type === 'new_reaction' || notif.type === 'new_comment') {
      if (notif.relatedId) navigate(`/confession/${notif.relatedId}`);
    } else if (notif.type === 'follow' && notif.senderId) {
      navigate(`/user/${notif.senderId}`);
    } else if (notif.type === 'message' && notif.senderId) {
      navigate(`/chat/${notif.senderId}`);
    } else {
      navigate('/notifications');
    }
    setIsVisible(false);
  };

  const handleClick = () => {
    if (notification) handleNavigation(notification);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
  };

  if (!isVisible || !notification) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300 cursor-pointer max-w-sm w-[calc(100%-2rem)]"
      onClick={handleClick}
    >
      <div className="bg-background border border-border rounded-2xl shadow-lg p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs truncate">{getNotificationTitle(notification.type)}</p>
          <p className="text-[10px] text-muted-foreground line-clamp-1">{notification.content}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
