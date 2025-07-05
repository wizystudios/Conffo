import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comment } from '@/types';

export function useRealTimeComments(confessionId: string, initialComments: Comment[]) {
  const [comments, setComments] = useState<Comment[]>(initialComments);

  useEffect(() => {
    // Set up real-time subscription for new comments on this confession
    const channel = supabase
      .channel(`confession-comments-${confessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `confession_id=eq.${confessionId}`
      }, (payload) => {
        console.log('New comment:', payload);
        const newComment = payload.new as any;
        const comment: Comment = {
          id: newComment.id,
          content: newComment.content,
          userId: newComment.user_id || '',
          timestamp: new Date(newComment.created_at).getTime(),
          confessionId: newComment.confession_id
        };
        setComments(prev => [...prev, comment]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'comments',
        filter: `confession_id=eq.${confessionId}`
      }, (payload) => {
        console.log('Comment deleted:', payload);
        setComments(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [confessionId]);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  return comments;
}