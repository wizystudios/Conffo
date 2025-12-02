import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useTypingIndicator(targetUserId: string) {
  const { user } = useAuth();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // Subscribe to typing events from target user
  useEffect(() => {
    if (!user || !targetUserId) return;

    const channelName = `typing:${[user.id, targetUserId].sort().join('-')}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId === targetUserId) {
          setIsTyping(true);
          
          // Clear existing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // Set new timeout to clear typing indicator
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user, targetUserId]);

  // Send typing event
  const sendTypingEvent = useCallback(() => {
    if (!user || !targetUserId || !channelRef.current) return;
    
    const channelName = `typing:${[user.id, targetUserId].sort().join('-')}`;
    
    supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id }
    });
  }, [user, targetUserId]);

  return { isTyping, sendTypingEvent };
}
