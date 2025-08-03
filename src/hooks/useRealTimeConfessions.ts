import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Confession } from '@/types';

export function useRealTimeConfessions(initialConfessions: Confession[]) {
  const [confessions, setConfessions] = useState<Confession[]>(initialConfessions);

  useEffect(() => {
    // Set up real-time subscription for confessions and reactions
    const confessionsChannel = supabase
      .channel('public:confessions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'confessions'
      }, (payload) => {
        console.log('New confession received in real-time:', payload);
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
        console.log('Confession deleted in real-time:', payload);
        setConfessions(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    // Set up real-time subscription for reactions
    const reactionsChannel = supabase
      .channel('public:reactions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reactions'
      }, (payload) => {
        console.log('New reaction received in real-time:', payload);
        const newReaction = payload.new as any;
        setConfessions(prev => prev.map(confession =>
          confession.id === newReaction.confession_id
            ? {
                ...confession,
                reactions: {
                  ...confession.reactions,
                  [newReaction.type]: confession.reactions[newReaction.type] + 1
                }
              }
            : confession
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'reactions'
      }, (payload) => {
        console.log('Reaction deleted in real-time:', payload);
        const deletedReaction = payload.old as any;
        setConfessions(prev => prev.map(confession =>
          confession.id === deletedReaction.confession_id
            ? {
                ...confession,
                reactions: {
                  ...confession.reactions,
                  [deletedReaction.type]: Math.max(0, confession.reactions[deletedReaction.type] - 1)
                }
              }
            : confession
        ));
      })
      .subscribe();

    // Set up real-time subscription for comments to update comment count
    const commentsChannel = supabase
      .channel('public:comments')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        console.log('New comment received in real-time for comment count:', payload);
        const newComment = payload.new as any;
        setConfessions(prev => prev.map(confession =>
          confession.id === newComment.confession_id
            ? {
                ...confession,
                commentCount: confession.commentCount + 1
              }
            : confession
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        console.log('Comment deleted in real-time for comment count:', payload);
        const deletedComment = payload.old as any;
        setConfessions(prev => prev.map(confession =>
          confession.id === deletedComment.confession_id
            ? {
                ...confession,
                commentCount: Math.max(0, confession.commentCount - 1)
              }
            : confession
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(confessionsChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, []);

  useEffect(() => {
    setConfessions(initialConfessions);
  }, [initialConfessions]);

  return confessions;
}