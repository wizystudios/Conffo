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
        
        // Parse media URLs - check if it's a JSON array
        let mediaUrls: string[] = [];
        let mediaTypes: ('image' | 'video' | 'audio')[] = [];
        let singleMediaUrl: string | null = null;
        let singleMediaType: 'image' | 'video' | 'audio' | undefined = undefined;
        
        if (newConfession.media_url) {
          try {
            // Try to parse as JSON array
            if (newConfession.media_url.startsWith('[')) {
              mediaUrls = JSON.parse(newConfession.media_url);
              mediaTypes = mediaUrls.map((url: string) => {
                if (url.match(/\.(mp4|webm|mov)$/i)) return 'video';
                if (url.match(/\.(mp3|wav|ogg|webm)$/i)) return 'audio';
                return 'image';
              });
            } else {
              // Single URL
              singleMediaUrl = newConfession.media_url;
              singleMediaType = newConfession.media_type as 'image' | 'video' | 'audio' | undefined;
              mediaUrls = [newConfession.media_url];
              mediaTypes = [singleMediaType || 'image'];
            }
          } catch {
            // If JSON parse fails, treat as single URL
            singleMediaUrl = newConfession.media_url;
            singleMediaType = newConfession.media_type as 'image' | 'video' | 'audio' | undefined;
            mediaUrls = [newConfession.media_url];
            mediaTypes = [singleMediaType || 'image'];
          }
        }
        
        const confession: Confession = {
          id: newConfession.id,
          content: newConfession.content,
          room: newConfession.room_id,
          userId: newConfession.user_id || '',
          timestamp: new Date(newConfession.created_at).getTime(),
          reactions: { like: 0, laugh: 0, shock: 0, heart: 0 },
          commentCount: 0,
          userReactions: [],
          mediaUrl: singleMediaUrl || (mediaUrls.length > 0 ? mediaUrls[0] : null),
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          mediaType: singleMediaType,
          mediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
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