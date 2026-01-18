import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ReadReceiptInfo {
  messageId: string;
  readCount: number;
}

export function useCommunityReadReceipts(communityId: string | undefined) {
  const { user } = useAuth();
  const [readReceipts, setReadReceipts] = useState<Record<string, number>>({});

  // Fetch read counts for all messages
  const fetchReadCounts = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length) return;

    try {
      const { data, error } = await supabase
        .from('community_message_reads')
        .select('message_id')
        .in('message_id', messageIds);

      if (error) throw error;

      // Count reads per message
      const counts: Record<string, number> = {};
      data?.forEach((read) => {
        counts[read.message_id] = (counts[read.message_id] || 0) + 1;
      });

      setReadReceipts(counts);
    } catch (error) {
      console.error('Error fetching read counts:', error);
    }
  }, []);

  // Mark a message as read by the current user
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user?.id || !messageId) return;

    try {
      // Upsert to avoid duplicate reads
      const { error } = await supabase
        .from('community_message_reads')
        .upsert(
          {
            message_id: messageId,
            user_id: user.id,
          },
          { onConflict: 'message_id,user_id' }
        );

      if (error && !error.message.includes('duplicate')) {
        console.error('Error marking message as read:', error);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [user?.id]);

  // Mark multiple messages as read (for visible messages)
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!user?.id || !messageIds.length) return;

    try {
      const readRecords = messageIds.map(msgId => ({
        message_id: msgId,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from('community_message_reads')
        .upsert(readRecords, { onConflict: 'message_id,user_id' });

      if (error && !error.message.includes('duplicate')) {
        console.error('Error marking messages as read:', error);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user?.id]);

  // Subscribe to real-time updates for read receipts
  useEffect(() => {
    if (!communityId) return;

    const channel = supabase
      .channel(`community-reads-${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_message_reads',
        },
        (payload) => {
          const newRead = payload.new as { message_id: string };
          setReadReceipts(prev => ({
            ...prev,
            [newRead.message_id]: (prev[newRead.message_id] || 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  return {
    readReceipts,
    markMessageAsRead,
    markMessagesAsRead,
    fetchReadCounts,
  };
}
