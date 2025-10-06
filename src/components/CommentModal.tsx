import { useState, useEffect } from 'react';
import { X, Send, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { toast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  confessionId: string;
  confessionContent: string;
  confessionAuthor: string;
}

export function CommentModal({ 
  isOpen, 
  onClose, 
  confessionId, 
  confessionContent, 
  confessionAuthor 
}: CommentModalProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      
      // Set up real-time subscription
      const channel = supabase
        .channel(`confession-comments-${confessionId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `confession_id=eq.${confessionId}`
        }, () => {
          fetchComments();
        })
        .on('postgres_changes', {
          event: 'DELETE',
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
        .select('id, content, created_at, user_id')
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user profiles for comments
      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment) => {
          let username = 'Anonymous User';
          let avatar_url = null;

          if (comment.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', comment.user_id)
              .maybeSingle();
            
            if (profileData) {
              username = profileData.username || 'Anonymous User';
              avatar_url = profileData.avatar_url;
            }
          }

          return {
            ...comment,
            username,
            avatar_url,
            likes: 0, // TODO: Implement comment likes
            isLiked: false,
            replies: []
          };
        })
      );

      setComments(commentsWithProfiles);
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
      setReplyingTo(null);
      toast({
        description: "Comment added successfully!"
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
          <div className="divide-y divide-border">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex gap-3">
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
                    
                    {/* Comment Actions */}
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {/* TODO: Implement comment likes */}}
                      >
                        <Heart className="h-3 w-3 mr-1" />
                        {comment.likes > 0 && comment.likes}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setReplyingTo(comment.id)}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Input */}
      {isAuthenticated ? (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
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