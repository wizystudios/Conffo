import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Heart, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { toast } from '@/hooks/use-toast';

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

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

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, parent_comment_id')
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process comments with profiles and likes
      const processedComments = await Promise.all(
        (commentsData || []).map(async (comment) => {
          // Get user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', comment.user_id)
            .maybeSingle();

          // Get like count and user's like status
          const { data: likeCount } = await supabase
            .rpc('get_comment_like_count', { comment_uuid: comment.id });

          let isLiked = false;
          if (user) {
            const { data: userLiked } = await supabase
              .rpc('user_liked_comment', { 
                comment_uuid: comment.id, 
                user_uuid: user.id 
              });
            isLiked = userLiked || false;
          }

          return {
            ...comment,
            username: profileData?.username || 'Anonymous User',
            avatar_url: profileData?.avatar_url,
            likes: likeCount || 0,
            isLiked,
            replies: [],
            replyCount: 0
          };
        })
      );

      // Separate top-level comments and replies
      const topLevelComments = processedComments.filter(c => !c.parent_comment_id);
      const replies = processedComments.filter(c => c.parent_comment_id);

      // Add replies to their parent comments and count them
      topLevelComments.forEach(comment => {
        comment.replies = replies.filter(reply => reply.parent_comment_id === comment.id);
        comment.replyCount = comment.replies.length;
      });

      setComments(topLevelComments);
      
      // Update comment count (only top-level comments)
      if (onCommentCountChange) {
        onCommentCountChange(topLevelComments.length);
      }
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
          content: newComment.trim(),
          parent_comment_id: replyingTo
        });

      if (error) throw error;

      setNewComment('');
      setReplyingTo(null);
      toast({
        description: replyingTo ? "Reply added successfully!" : "Comment added successfully!"
      });
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

  const handleLike = async (commentId: string) => {
    if (!user) return;

    try {
      const comment = comments.find(c => c.id === commentId) || 
                    comments.flatMap(c => c.replies || []).find(r => r.id === commentId);
      
      if (!comment) return;

      if (comment.isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id
          });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(commentId)) {
        newExpanded.delete(commentId);
      } else {
        newExpanded.add(commentId);
      }
      return newExpanded;
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 2592000)}mo`;
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8' : ''}`}>
      <div className="flex gap-3 py-2">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={comment.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${comment.user_id}`} 
            alt={comment.username} 
          />
          <AvatarFallback>
            {comment.username?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{comment.username}</span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
          <p className="text-sm mb-2">{comment.content}</p>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-0 text-xs hover:text-foreground ${
                comment.isLiked ? 'text-red-500' : 'text-muted-foreground'
              }`}
              onClick={() => handleLike(comment.id)}
            >
              <Heart className={`h-3 w-3 mr-1 ${comment.isLiked ? 'fill-current' : ''}`} />
              {comment.likes > 0 && comment.likes}
            </Button>
            
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setReplyingTo(comment.id)}
              >
                Reply
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Reply toggle button */}
      {!isReply && comment.replyCount && comment.replyCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-11 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={() => toggleReplies(comment.id)}
        >
          {expandedReplies.has(comment.id) ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </>
          )}
        </Button>
      )}
      
      {/* Render replies */}
      {!isReply && expandedReplies.has(comment.id) && comment.replies && (
        <div className="mt-2">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

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
          <div className="px-4">
            {comments.map((comment, index) => (
              <div key={comment.id}>
                {renderComment(comment)}
                {index < comments.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Input */}
      {isAuthenticated ? (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
          {replyingTo && (
            <div className="mb-2 text-xs text-muted-foreground">
              Replying to comment{' '}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-auto p-0 text-xs underline"
              >
                Cancel
              </Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${user?.id}`} 
                alt="Your avatar" 
              />
              <AvatarFallback>
                {user?.user_metadata?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                className="min-h-[40px] resize-none"
                rows={1}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 text-center">
          <p className="text-muted-foreground text-sm">Sign in to comment</p>
        </div>
      )}
    </div>
  );
}