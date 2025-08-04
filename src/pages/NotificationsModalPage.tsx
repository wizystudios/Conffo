import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Trash2, CheckCheck, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BottomSlideModal } from '@/components/BottomSlideModal';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export function NotificationsModalPage({ isOpen, onClose }: NotificationsModalProps) {
  const { user } = useAuth();
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          content,
          is_read,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(notification => ({
        id: notification.id,
        type: notification.type,
        message: notification.content || '',
        read: notification.is_read || false,
        created_at: notification.created_at,
        sender: null
      })) || [];
    },
    enabled: !!user?.id && isOpen,
    refetchInterval: 30000
  });

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleMarkNotificationsAsRead = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      refetch();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleDeleteSelectedNotifications = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      await supabase
        .from('notifications')
        .delete()
        .in('id', Array.from(selectedNotifications));

      setSelectedNotifications(new Set());
      refetch();
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleDeleteAllNotifications = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      refetch();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  return (
    <BottomSlideModal isOpen={isOpen} onClose={onClose} title="Notifications">
      <div className="p-4 space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {unreadNotificationsCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadNotificationsCount}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {unreadNotificationsCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkNotificationsAsRead}
                className="flex items-center gap-1"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAllNotifications}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
          </div>
        </div>

        {/* Selected Actions */}
        {selectedNotifications.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm">
              {selectedNotifications.size} notification{selectedNotifications.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelectedNotifications}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete selected
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-background'
                }`}
              >
                <Checkbox
                  checked={selectedNotifications.has(notification.id)}
                  onCheckedChange={() => toggleNotificationSelection(notification.id)}
                  className="mt-1"
                />
                
                {notification.sender && (
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage
                      src={notification.sender.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${notification.sender.id}`}
                      alt={notification.sender.username}
                    />
                    <AvatarFallback>
                      {notification.sender.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm">
                        {notification.sender && (
                          <span className="font-medium">
                            {notification.sender.username}
                          </span>
                        )}
                        {' '}
                        <span className={!notification.read ? 'font-medium' : ''}>
                          {notification.message}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </BottomSlideModal>
  );
}