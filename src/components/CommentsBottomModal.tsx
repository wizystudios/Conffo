import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BottomSlideModal } from '@/components/BottomSlideModal';
import { toast } from '@/hooks/use-toast';
import { TreeComment } from '@/components/TreeComment';
import { Confession, Comment } from '@/types';

interface CommentsBottomModalProps {
  isOpen: boolean;
  onClose: () => void;
  confessionId: string;
  confession: Confession;
  onCommentCountChange?: (count: number) => void;
}

export function CommentsBottomModal({ isOpen, onClose, confessionId, confession, onCommentCountChange }: CommentsBottomModalProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const { data: comments = [], refetch } = useQuery({
    queryKey: ['comments', confessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          parent_comment_id
        `)
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(comment => ({
        id: comment.id,
        confessionId: confessionId,
        content: comment.content,
        timestamp: new Date(comment.created_at),
        userId: comment.user_id,
        parentCommentId: comment.parent_comment_id || undefined
      }));
    },
    enabled: !!confessionId && isOpen
  });

  // Update comment count when comments change
  if (onCommentCountChange && comments) {
    onCommentCountChange(comments.length);
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            confession_id: confessionId,
            user_id: user.id,
            content: newComment.trim(),
            parent_comment_id: replyingTo
          }
        ]);

      if (error) throw error;

      setNewComment('');
      setReplyingTo(null);
      refetch();
      toast({
        description: "Comment posted!"
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        description: "Failed to post comment.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  // Build tree structure
  const buildCommentTree = (comments: Comment[]) => {
    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: (Comment & { replies: Comment[] })[] = [];

    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(commentWithReplies);
        } else {
          rootComments.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const commentTree = buildCommentTree(comments);

  return (
    <BottomSlideModal isOpen={isOpen} onClose={onClose} title="">
      <div className="flex flex-col h-full">
        {/* Post Media - Compact at Top */}
        {confession.mediaUrl && (
          <div className="w-full bg-black">
            {confession.mediaType === 'image' ? (
              <img 
                src={confession.mediaUrl} 
                alt="Post" 
                className="w-full h-auto max-h-[30vh] object-contain"
              />
            ) : confession.mediaType === 'video' ? (
              <video 
                src={confession.mediaUrl} 
                className="w-full h-auto max-h-[30vh] object-contain"
                controls
                playsInline
              />
            ) : confession.mediaType === 'audio' ? (
              <div className="p-3">
                <audio 
                  src={confession.mediaUrl} 
                  controls
                  className="w-full"
                />
              </div>
            ) : null}
          </div>
        )}

        {/* Header with comment count */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <h2 className="font-semibold text-sm">{comments.length} comments</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            ✕
          </Button>
        </div>

        {/* Comments List with Tree Structure */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {commentTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No comments yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {commentTree.map((comment) => (
                <TreeComment
                  key={comment.id}
                  comment={comment}
                  onUpdate={refetch}
                  replies={comment.replies}
                  onReply={handleReply}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comment Input - Fixed at Bottom */}
        {user && (
          <div className="border-t px-3 py-2">
            {replyingTo && (
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <span>Replying to comment...</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                  className="h-5 px-1 text-xs"
                >
                  Cancel
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${user.id}`}
                  alt={user.username || 'User'}
                />
                <AvatarFallback className="text-xs">
                  {(user.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Input
                placeholder="Add comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 border-0 bg-transparent text-xs focus-visible:ring-0 px-0 h-8"
              />
              <Button 
                type="submit" 
                variant="ghost"
                size="sm"
                disabled={!newComment.trim() || isSubmitting}
                className="text-primary font-semibold text-xs h-auto p-0 hover:bg-transparent bounce-in"
              >
                Post
              </Button>
            </form>
          </div>
        )}
      </div>
    </BottomSlideModal>
  );
}
