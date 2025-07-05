import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Confession } from '@/types';

export function useRealTimeConfessions(initialConfessions: Confession[]) {
  const [confessions, setConfessions] = useState<Confession[]>(initialConfessions);

  useEffect(() => {
    // Set up real-time subscription for new confessions
    const channel = supabase
      .channel('public:confessions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'confessions'
      }, (payload) => {
        console.log('New confession:', payload);
        // Add the new confession to the top of the list
        const newConfession = payload.new as any;
        const confession: Confession = {
          id: newConfession.id,
          content: newConfession.content,
          room: newConfession.room_id,
          userId: newConfession.user_id || '',
          timestamp: new Date(newConfession.created_at).getTime(),
          reactions: { like: 0, laugh: 0, shock: 0, heart: 0 },
          commentCount: 0,
          userReactions: [],
          mediaUrl: newConfession.media_url,
          mediaType: newConfession.media_type,
          tags: newConfession.tags || []
        };
        setConfessions(prev => [confession, ...prev]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'confessions'
      }, (payload) => {
        console.log('Confession deleted:', payload);
        setConfessions(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setConfessions(initialConfessions);
  }, [initialConfessions]);

  return confessions;
}