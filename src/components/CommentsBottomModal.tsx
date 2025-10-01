import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Send, Heart, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BottomSlideModal } from '@/components/BottomSlideModal';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { RoomBadge } from './RoomBadge';
import { UsernameDisplay } from './UsernameDisplay';
import { Confession } from '@/types';

interface CommentsBottomModalProps {
  isOpen: boolean;
  onClose: () => void;
  confessionId: string;
  confession: Confession;
  onCommentCountChange?: (count: number) => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  user_liked: boolean;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export function CommentsBottomModal({ isOpen, onClose, confessionId, confession, onCommentCountChange }: CommentsBottomModalProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: comments = [], refetch } = useQuery({
    queryKey: ['comments', confessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id
        `)
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const userIds = data?.map(c => c.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      return data?.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        likes_count: 0,
        user_liked: false,
        profiles: profiles?.find(p => p.id === comment.user_id) || {
          id: comment.user_id,
          username: 'Anonymous',
          avatar_url: null
        }
      })) || [];
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
            content: newComment.trim()
          }
        ]);

      if (error) throw error;

      setNewComment('');
      refetch();
      toast({
        title: "Comment posted!",
        description: "Your comment has been added successfully."
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('comment_likes')
          .insert([{ comment_id: commentId, user_id: user.id }]);
      }

      refetch();
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      refetch();
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed."
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive"
      });
    }
  };

  const totalLikes = confession.reactions.like + confession.reactions.heart + confession.reactions.laugh + confession.reactions.shock;

  return (
    <BottomSlideModal isOpen={isOpen} onClose={onClose} title="">
      <div className="flex flex-col h-[80vh]">
        {/* Minimized Confession at Top */}
        <Card className="mx-4 mt-2 mb-4 shadow-sm">
          <CardContent className="p-3">
            <div className="flex justify-between items-center mb-2">
              <UsernameDisplay userId={confession.userId} size="sm" />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
              </span>
            </div>
            
            <div className="text-sm line-clamp-3 mb-2">
              {confession.content}
            </div>
            
            {confession.mediaUrl && (
              <div className="rounded-md overflow-hidden mb-2 border max-h-32">
                {confession.mediaType === 'image' ? (
                  <img 
                    src={confession.mediaUrl} 
                    alt="Confession media" 
                    className="w-full h-auto max-h-32 object-cover"
                  />
                ) : confession.mediaType === 'video' ? (
                  <video 
                    src={confession.mediaUrl} 
                    className="w-full h-auto max-h-32 object-cover"
                  />
                ) : null}
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs">
              <RoomBadge room={confession.room} />
              <div className="flex gap-3 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" /> {totalLikes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> {comments?.length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage
                    src={comment.profiles.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${comment.profiles.id}`}
                    alt={comment.profiles.username}
                  />
                  <AvatarFallback>
                    {comment.profiles.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{comment.profiles.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {user?.id === comment.profiles.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-destructive"
                          >
                            Delete comment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  <p className="text-sm">{comment.content}</p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikeComment(comment.id, comment.user_liked)}
                      className="h-6 px-2 text-xs"
                    >
                      <Heart className={`h-3 w-3 mr-1 ${comment.user_liked ? 'fill-current text-red-500' : ''}`} />
                      {comment.likes_count || 0}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        {user && (
          <div className="border-t p-4">
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${user.id}`}
                  alt={user.username || 'User'}
                />
                <AvatarFallback>
                  {(user.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!newComment.trim() || isSubmitting}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </BottomSlideModal>
  );
}
