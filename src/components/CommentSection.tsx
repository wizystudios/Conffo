
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CommentCard } from './CommentCard';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username?: string;
}

interface CommentSectionProps {
  confessionId: string;
  onUpdate?: () => void;
}

export function CommentSection({ confessionId, onUpdate }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    
    // Set up real-time subscription for new comments
    const channel = supabase
      .channel(`confession-comments-${confessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `confession_id=eq.${confessionId}`
      }, () => {
        fetchComments(); // Refresh comments when new ones are added
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'comments',
        filter: `confession_id=eq.${confessionId}`
      }, () => {
        fetchComments(); // Refresh comments when comments are deleted
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [confessionId]);

  const fetchComments = async () => {
    try {
      // First, get the comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Then, get the usernames for each comment
      const commentsWithUsernames = await Promise.all(
        (commentsData || []).map(async (comment) => {
          if (comment.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', comment.user_id)
              .maybeSingle();
            
            return {
              ...comment,
              username: profileData?.username || null
            };
          }
          return {
            ...comment,
            username: null
          };
        })
      );

      setComments(commentsWithUsernames);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          confession_id: confessionId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        variant: "destructive",
        description: "Failed to add comment"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="border-t border-border">
      {/* Comments List */}
      <div className="max-h-96 overflow-y-auto">
        {comments.length > 0 ? (
          <div className="space-y-3 p-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {comment.username || 'Anonymous User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No comments yet</p>
          </div>
        )}
      </div>

      {/* Comment Form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 min-h-[40px] resize-none"
              rows={2}
            />
            <Button 
              type="submit" 
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4 text-center border-t border-border">
          <p className="text-muted-foreground text-sm">Sign in to comment</p>
        </div>
      )}
    </div>
  );
}
