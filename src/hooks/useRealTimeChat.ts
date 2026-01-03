import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, getMessages } from '@/services/chatService';
import { useAuth } from '@/context/AuthContext';

export const useRealTimeChat = (targetUserId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const channelRef = useRef<any>(null);

  const loadMessages = useCallback(async () => {
    if (!user || !targetUserId) return;
    try {
      const data = await getMessages(targetUserId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, targetUserId]);

  const refresh = useCallback(async () => {
    if (!user || !targetUserId) return;
    setIsRefreshing(true);
    try {
      const data = await getMessages(targetUserId);
      setMessages(data);
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [user, targetUserId]);

  useEffect(() => {
    if (!user || !targetUserId) return;

    loadMessages();

    // Set up real-time subscription
    channelRef.current = supabase
      .channel(`messages-${user.id}-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id}))`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id}))`
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id}))`
        },
        (payload) => {
          const deletedMessage = payload.old as Message;
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id));
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, targetUserId, loadMessages]);

  return { messages, isLoading, isRefreshing, setMessages, refresh };
};