import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, Heart, Reply, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { toast } from '@/hooks/use-toast';
import { Comment as CommentType } from '@/types';
import { offlineQueue } from '@/utils/offlineQueue';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { haptic } from '@/utils/hapticFeedback';
import { useNavigate } from 'react-router-dom';

interface CommentWithProfile extends CommentType {
  username?: string;
  avatarUrl?: string;
  likesCount?: number;
  isLiked?: boolean;
}

interface UnifiedCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  confessionId: string;
  confessionContent: string;
  confessionAuthor: string;
  confessionAuthorId?: string;
  onCommentCountChange?: (count: number) => void;
  onCommentSuccess?: () => void;
  confessionMediaUrl?: string;
  confessionMediaType?: 'image' | 'video';
  confessionMediaUrls?: string[];
  confessionMediaTypes?: ('image' | 'video' | 'audio')[];
}

export function UnifiedCommentModal({ 
  isOpen, 
  onClose, 
  confessionId, 
  confessionContent, 
  confessionAuthor,
  confessionAuthorId,
  onCommentCountChange,
  onCommentSuccess,
  confessionMediaUrl,
  confessionMediaType,
  confessionMediaUrls,
  confessionMediaTypes
}: UnifiedCommentModalProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      
      const channel = supabase
        .channel(`comments-${confessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `confession_id=eq.${confessionId}`
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', comment.user_id)
            .maybeSingle();

          const { count: likesCount } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id);

          let isLiked = false;
          if (user) {
            const { data: likeData } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .maybeSingle();
            isLiked = !!likeData;
          }

          // Check following relationship for Fan/Crew badges
          let isFollower = false;
          let isFollowing = false;
          
          if (user && comment.user_id) {
            const { data: followerData } = await supabase
              .from('user_follows')
              .select('id')
              .eq('follower_id', comment.user_id)
              .eq('following_id', user.id)
              .maybeSingle();
            isFollower = !!followerData;

            const { data: followingData } = await supabase
              .from('user_follows')
              .select('id')
              .eq('follower_id', user.id)
              .eq('following_id', comment.user_id)
              .maybeSingle();
            isFollowing = !!followingData;
          }

          return {
            id: comment.id,
            content: comment.content,
            userId: comment.user_id,
            confessionId: confessionId,
            timestamp: new Date(comment.created_at).getTime(),
            parentCommentId: comment.parent_comment_id,
            replies: [],
            username: profile?.username || 'Anonymous',
            avatarUrl: profile?.avatar_url,
            likesCount: likesCount || 0,
            isLiked,
            isFollower,
            isFollowing
          };
        })
      );

      setComments(commentsWithProfiles);
      
      if (onCommentCountChange) {
        onCommentCountChange(commentsWithProfiles.length);
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

    const commentContent = newComment.trim();
    const parentId = replyingTo?.id;
    
    setNewComment('');
    setReplyingTo(null);
    
    // Optimistic update
    const optimisticComment: CommentWithProfile = {
      id: `temp-${Date.now()}`,
      content: commentContent,
      userId: user.id,
      confessionId: confessionId,
      timestamp: Date.now(),
      parentCommentId: parentId,
      replies: [],
      username: 'You',
      likesCount: 0,
      isLiked: false
    };
    
    setComments(prev => [optimisticComment, ...prev]);
    haptic.light();
    
    setIsSubmitting(true);
    try {
      const commentData = {
        confession_id: confessionId,
        user_id: user.id,
        content: commentContent,
        parent_comment_id: parentId
      };

      if (!navigator.onLine) {
        offlineQueue.add('comment', commentData);
      } else {
        const { error } = await supabase.from('comments').insert(commentData);
        if (error) throw error;
        if (onCommentSuccess) onCommentSuccess();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      toast({ variant: "destructive", description: "❌ Failed to add comment" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    // Optimistic update
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, isLiked: !c.isLiked, likesCount: c.isLiked ? (c.likesCount || 1) - 1 : (c.likesCount || 0) + 1 }
        : c
    ));
    haptic.light();

    try {
      if (comment.isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
      }
    } catch (error) {
      // Revert on error
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, isLiked: comment.isLiked, likesCount: comment.likesCount }
          : c
      ));
    }
  };

  // Swipe to dismiss handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - dragStartY.current;
    if (diff > 0) {
      setSwipeY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (swipeY > 100) {
      haptic.medium();
      onClose();
    }
    setSwipeY(0);
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        ref={containerRef}
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl flex flex-col max-h-[85vh] transition-transform duration-300"
        style={{ transform: `translateY(${swipeY}px)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div 
          className="py-3 flex justify-center cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h2 className="text-lg font-semibold">Comments</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Post Preview */}
        {confessionAuthor && confessionContent && (
          <div className="border-b border-border p-3 bg-muted/10">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${confessionAuthorId || confessionAuthor}`} />
                <AvatarFallback>{confessionAuthor.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">{confessionAuthor}</span>
                <p className="text-sm text-muted-foreground line-clamp-2">{confessionContent}</p>
                
                {(confessionMediaUrls && confessionMediaUrls.length > 0) && (
                  <div className="mt-2 flex gap-1 overflow-x-auto">
                    {confessionMediaUrls.slice(0, 3).map((url, index) => (
                      <div key={index} className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                        {confessionMediaTypes?.[index] === 'video' ? (
                          <video src={url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No comments yet</p>
              <p className="text-muted-foreground text-sm">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-card rounded-xl p-3 shadow-sm border border-border/50">
                <p className="text-sm mb-2">{comment.content}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                    </span>
                    <Avatar 
                      className="h-6 w-6 cursor-pointer" 
                      onClick={() => navigate(`/profile/${comment.userId}`)}
                    >
                      <AvatarImage src={comment.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${comment.userId}`} />
                      <AvatarFallback>{(comment.username || 'U').charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span 
                      className="text-sm font-medium cursor-pointer hover:underline"
                      onClick={() => navigate(`/profile/${comment.userId}`)}
                    >
                      {comment.username}
                    </span>
                    
                    {/* Fan/Crew badges */}
                    {(comment as any).isFollower && (
                      <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-600 border-amber-500/30">
                        ⭐ Fan
                      </Badge>
                    )}
                    {(comment as any).isFollowing && (
                      <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-600 border-blue-500/30">
                        <Users className="h-2.5 w-2.5 mr-0.5" /> Crew
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        comment.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${comment.isLiked ? 'fill-current' : ''}`} />
                      {(comment.likesCount || 0) > 0 && <span>{comment.likesCount}</span>}
                    </button>
                    
                    {isAuthenticated && (
                      <button
                        onClick={() => setReplyingTo({ id: comment.id, username: comment.username || 'User' })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Reply className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        {isAuthenticated ? (
          <div className="border-t border-border p-3 bg-background">
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1">
                <span>Replying to @{replyingTo.username}</span>
                <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-auto p-0 text-xs">
                  Cancel
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)} 
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."} 
                className="min-h-[40px] text-sm resize-none rounded-xl" 
                rows={1} 
              />
              <Button 
                type="submit" 
                disabled={!newComment.trim() || isSubmitting} 
                size="icon"
                className="h-10 w-10 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="border-t border-border p-3 text-center">
            <p className="text-muted-foreground text-sm">Sign in to comment</p>
          </div>
        )}
      </div>
    </div>
  );
}