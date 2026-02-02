import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { requestNotificationPermission, showNotification } from '@/utils/pushNotifications';

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuth();

  // Request permission on mount
  useEffect(() => {
    if (isAuthenticated) {
      requestNotificationPermission();
    }
  }, [isAuthenticated]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`push-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const notification = payload.new as any;
          
          // Determine notification details based on type
          let title = 'New Notification';
          let body = notification.content || '';
          let onClick = () => {};

          switch (notification.type) {
            case 'new_reaction':
            case 'like':
              title = '❤️ New Like';
              onClick = () => {
                if (notification.related_id) {
                  window.location.href = `/confession/${notification.related_id}`;
                }
              };
              break;
            case 'new_comment':
            case 'comment':
              title = '💬 New Comment';
              onClick = () => {
                if (notification.related_id) {
                  window.location.href = `/confession/${notification.related_id}`;
                }
              };
              break;
            case 'new_message':
            case 'message':
              title = '✉️ New Message';
              onClick = () => {
                window.location.href = '/chat';
              };
              break;
            case 'mention':
              title = '@ Mentioned You';
              onClick = () => {
                if (notification.related_id) {
                  window.location.href = `/confession/${notification.related_id}`;
                }
              };
              break;
            case 'follow':
              title = '👤 New Follower';
              onClick = () => {
                window.location.href = '/notifications';
              };
              break;
            default:
              title = 'Conffo';
          }

          showNotification(title, {
            body,
            tag: `notification-${notification.id}`,
            onClick
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const requestPermission = useCallback(async () => {
    return await requestNotificationPermission();
  }, []);

  return { requestPermission };
}
