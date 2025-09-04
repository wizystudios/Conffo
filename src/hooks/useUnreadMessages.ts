import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    const loadUnreadCounts = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error loading unread counts:', error);
        return;
      }

      // Count unread messages per sender
      const counts: Record<string, number> = {};
      data.forEach(message => {
        counts[message.sender_id] = (counts[message.sender_id] || 0) + 1;
      });

      setUnreadCounts(counts);
    };

    loadUnreadCounts();

    // Listen for new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id.eq.${user.id}`
        },
        (payload) => {
          const newMessage = payload.new as any;
          setUnreadCounts(prev => ({
            ...prev,
            [newMessage.sender_id]: (prev[newMessage.sender_id] || 0) + 1
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id.eq.${user.id}`
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          if (updatedMessage.is_read) {
            setUnreadCounts(prev => {
              const newCounts = { ...prev };
              if (newCounts[updatedMessage.sender_id] > 0) {
                newCounts[updatedMessage.sender_id]--;
                if (newCounts[updatedMessage.sender_id] === 0) {
                  delete newCounts[updatedMessage.sender_id];
                }
              }
              return newCounts;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (senderId: string) => {
    if (!user) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', senderId)
      .eq('is_read', false);

    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[senderId];
      return newCounts;
    });
  };

  return { unreadCounts, markAsRead };
};