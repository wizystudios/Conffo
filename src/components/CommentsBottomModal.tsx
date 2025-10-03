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
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        {/* Post Media - Full Width at Top */}
        {confession.mediaUrl && (
          <div className="w-full bg-black">
            {confession.mediaType === 'image' ? (
              <img 
                src={confession.mediaUrl} 
                alt="Post" 
                className="w-full h-auto max-h-[50vh] object-contain"
              />
            ) : confession.mediaType === 'video' ? (
              <video 
                src={confession.mediaUrl} 
                className="w-full h-auto max-h-[50vh] object-contain"
                controls
                playsInline
              />
            ) : confession.mediaType === 'audio' ? (
              <div className="p-4">
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
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-base">{comments.length} comments</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            ✕
          </Button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-white dark:bg-gray-900">
          {comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs mt-1">Start the conversation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 items-start">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage
                      src={comment.profiles.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${comment.profiles.id}`}
                      alt={comment.profiles.username}
                    />
                    <AvatarFallback className="text-xs bg-gray-200">
                      {comment.profiles.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold mr-2">{comment.profiles.username}</span>
                          <span className="text-gray-900 dark:text-gray-100">{comment.content}</span>
                        </p>
                        
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }).replace('about ', '')}
                          </span>
                          
                          {comment.likes_count > 0 && (
                            <span className="text-xs text-gray-500 font-semibold">
                              {comment.likes_count} {comment.likes_count === 1 ? 'like' : 'likes'}
                            </span>
                          )}
                          
                          <button className="text-xs text-gray-500 font-semibold hover:text-gray-700">
                            Reply
                          </button>
                          
                          {user?.id === comment.profiles.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-auto p-0">
                                  <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-red-600 text-xs"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikeComment(comment.id, comment.user_liked)}
                        className="h-auto p-0 mt-1"
                      >
                        {comment.user_liked ? (
                          <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                        ) : (
                          <Heart className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Input - Fixed at Bottom */}
        {user && (
          <div className="border-t bg-white dark:bg-gray-900 px-4 py-3">
            <form onSubmit={handleSubmitComment} className="flex items-center gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${user.id}`}
                  alt={user.username || 'User'}
                />
                <AvatarFallback className="bg-gray-200">
                  {(user.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Input
                placeholder="Add comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 border-0 bg-transparent text-sm focus-visible:ring-0 px-0"
              />
              <Button 
                type="submit" 
                variant="ghost"
                size="sm"
                disabled={!newComment.trim() || isSubmitting}
                className="text-[#0095F6] hover:text-[#0095F6]/80 font-semibold text-sm h-auto p-0 hover:bg-transparent"
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
