import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  requestNotificationPermission,
  showCommunityMessageNotification,
} from '@/utils/pushNotifications';

type Cache = Map<string, string>;

type CommunityMessageRow = {
  id: string;
  community_id: string;
  sender_id: string;
  content: string;
  message_type: string;
};

function formatCommunityMessagePreview(row: CommunityMessageRow): string {
  if (row.message_type === 'text') return row.content;
  if (row.message_type === 'image') return '📷 Photo';
  if (row.message_type === 'video') return '🎬 Video';
  if (row.message_type === 'audio') return '🎤 Voice message';
  return 'New message';
}

export function useCommunityMessageNotifications(enabled: boolean) {
  const { user, isAuthenticated } = useAuth();

  const senderNameCache = useRef<Cache>(new Map());
  const communityNameCache = useRef<Cache>(new Map());

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.id) return;

    // Ask once after login; without permission browser notifications won't show.
    requestNotificationPermission().catch(() => undefined);

    let cancelled = false;

    const getSenderName = async (senderId: string): Promise<string> => {
      const cached = senderNameCache.current.get(senderId);
      if (cached) return cached;

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', senderId)
        .maybeSingle();

      const name = data?.username || 'Someone';
      senderNameCache.current.set(senderId, name);
      return name;
    };

    const getCommunityName = async (communityId: string): Promise<string> => {
      const cached = communityNameCache.current.get(communityId);
      if (cached) return cached;

      const { data } = await supabase
        .from('communities')
        .select('name')
        .eq('id', communityId)
        .maybeSingle();

      const name = data?.name || 'Community';
      communityNameCache.current.set(communityId, name);
      return name;
    };

    const channel = supabase
      .channel(`community-message-notifs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
        },
        async (payload) => {
          const row = payload.new as unknown as CommunityMessageRow;
          if (!row?.community_id || !row?.sender_id) return;

          // Don't notify for your own outgoing messages.
          if (row.sender_id === user.id) return;

          const [senderName, communityName] = await Promise.all([
            getSenderName(row.sender_id),
            getCommunityName(row.community_id),
          ]);

          if (cancelled) return;

          showCommunityMessageNotification(
            senderName,
            communityName,
            formatCommunityMessagePreview(row),
            row.community_id
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled, isAuthenticated, user?.id]);
}
