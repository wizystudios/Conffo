import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface NotificationData {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: string;
}

export function MessageNotification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Don't show notification if on the chat page with this user
          if (window.location.pathname.includes(`/chat/${newMessage.sender_id}`)) {
            return;
          }

          // Get sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          const displayContent = newMessage.message_type === 'text' 
            ? newMessage.content.slice(0, 50) + (newMessage.content.length > 50 ? '...' : '')
            : `Sent ${newMessage.message_type === 'image' ? 'an image' : newMessage.message_type === 'video' ? 'a video' : 'a voice message'}`;

          setNotification({
            id: newMessage.id,
            senderId: newMessage.sender_id,
            senderName: profile?.username || 'Someone',
            senderAvatar: profile?.avatar_url,
            content: displayContent,
            messageType: newMessage.message_type
          });
          setIsVisible(true);

          // Play notification sound
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBTON2+/Edj');
          audio.volume = 0.5;
          audio.play().catch(() => {});

          // Auto-hide after 4 seconds
          setTimeout(() => {
            setIsVisible(false);
          }, 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleClick = () => {
    if (notification) {
      navigate(`/chat/${notification.senderId}`);
      setIsVisible(false);
    }
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
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarImage src={notification.senderAvatar} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {notification.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{notification.senderName}</p>
          <p className="text-xs text-muted-foreground truncate">{notification.content}</p>
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
