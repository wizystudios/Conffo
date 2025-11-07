import { useState, useEffect } from 'react';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { toast } from '@/hooks/use-toast';
import { TreeComment } from '@/components/TreeComment';
import { Comment as CommentType } from '@/types';
import { offlineQueue } from '@/utils/offlineQueue';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id?: string;
  username?: string;
  avatar_url?: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
  replyCount?: number;
}

interface ImprovedCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  confessionId: string;
  confessionContent: string;
  confessionAuthor: string;
  onCommentCountChange?: (count: number) => void;
  confessionMediaUrl?: string;
  confessionMediaType?: 'image' | 'video';
  confessionMediaUrls?: string[];
  confessionMediaTypes?: ('image' | 'video' | 'audio')[];
}

export function ImprovedCommentModal({ 
  isOpen, 
  onClose, 
  confessionId, 
  confessionContent, 
  confessionAuthor,
  onCommentCountChange,
  confessionMediaUrl,
  confessionMediaType,
  confessionMediaUrls,
  confessionMediaTypes
}: ImprovedCommentModalProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentTree, setCommentTree] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      
      // Real-time subscriptions
      const channel = supabase
        .channel(`confession-comments-${confessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `confession_id=eq.${confessionId}`
        }, () => {
          fetchComments();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comment_likes'
        }, () => {
          fetchComments();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, confessionId]);

  const buildCommentTree = (comments: any[]): CommentType[] => {
    const commentMap = new Map<string, CommentType>();
    const rootComments: CommentType[] = [];

    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(commentMap.get(comment.id)!);
        }
      } else {
        rootComments.push(commentMap.get(comment.id)!);
      }
    });

    return rootComments;
  };

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, parent_comment_id')
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const processedComments = (commentsData || []).map(comment => ({
        id: comment.id,
        content: comment.content,
        userId: comment.user_id,
        confessionId: confessionId,
        timestamp: new Date(comment.created_at).getTime(),
        parentCommentId: comment.parent_comment_id,
        replies: []
      }));

      setComments(processedComments);
      setCommentTree(buildCommentTree(processedComments));
      
      if (onCommentCountChange) {
        onCommentCountChange(processedComments.length);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const commentData = {
        confession_id: confessionId,
        user_id: user.id,
        content: newComment.trim(),
        parent_comment_id: replyingTo
      };

      if (!navigator.onLine) {
        offlineQueue.add('comment', commentData);
        setNewComment('');
        setReplyingTo(null);
      } else {
        const { error } = await supabase.from('comments').insert(commentData);
        if (error) throw error;
        setNewComment('');
        setReplyingTo(null);
        toast({ description: "✅ Comment added!" });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ variant: "destructive", description: "❌ Failed to add comment" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border rounded-b-3xl">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Comments</h1>
          <div className="w-8" />
        </div>
      </div>

      {/* Post Preview - Compact */}
      {confessionAuthor && confessionContent && (
        <div className="border-b border-border p-4 bg-muted/20">
          <div className="flex gap-3">
            <UsernameDisplay 
              userId=""
              showAvatar={true}
              size="sm"
              linkToProfile={false}
              showStoryIndicator={false}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{confessionAuthor}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{confessionContent}</p>
              
              {/* Show media if available */}
              {confessionMediaUrls && confessionMediaUrls.length > 0 ? (
                <div className="mt-2 rounded-lg overflow-hidden max-w-xs">
                  {confessionMediaUrls.length > 1 ? (
                    <div className="flex gap-1 overflow-x-auto">
                      {confessionMediaUrls.map((url, index) => (
                        <div key={index} className="flex-shrink-0 w-24 h-24">
                          {confessionMediaTypes?.[index] === 'video' ? (
                            <video src={url} className="w-full h-full object-cover rounded" />
                          ) : (
                            <img src={url} alt="" className="w-full h-full object-cover rounded" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-32 h-32">
                      {confessionMediaTypes?.[0] === 'video' ? (
                        <video src={confessionMediaUrls[0]} className="w-full h-full object-cover rounded" />
                      ) : (
                        <img src={confessionMediaUrls[0]} alt="" className="w-full h-full object-cover rounded" />
                      )}
                    </div>
                  )}
                </div>
              ) : confessionMediaUrl && (
                <div className="mt-2 rounded-lg overflow-hidden w-32 h-32">
                  {confessionMediaType === 'video' ? (
                    <video src={confessionMediaUrl} className="w-full h-full object-cover rounded" />
                  ) : (
                    <img src={confessionMediaUrl} alt="" className="w-full h-full object-cover rounded" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No comments yet</p>
            <p className="text-muted-foreground text-xs mt-1">Be the first to comment!</p>
          </div>
        ) : (
          <div className="px-2">
            {commentTree.map((comment) => (
              <TreeComment
                key={comment.id}
                comment={comment}
                onUpdate={fetchComments}
                onReply={handleReply}
                replies={comment.replies || []}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comment Input */}
      {isAuthenticated ? (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3">
          {replyingTo && (
            <div className="mb-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Replying...</span>
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-auto p-0 text-xs">Cancel</Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={replyingTo ? "Reply..." : "Comment..."} className="min-h-[32px] text-sm resize-none" rows={1} />
            <Button type="submit" disabled={!newComment.trim() || isSubmitting} size="sm" className="h-8"><Send className="h-3 w-3" /></Button>
          </form>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 text-center">
          <p className="text-muted-foreground text-xs">Sign in to comment</p>
        </div>
      )}
    </div>
  );
}