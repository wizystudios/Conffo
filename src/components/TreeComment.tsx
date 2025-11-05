import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Heart, Reply, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UsernameDisplay } from './UsernameDisplay';
import { useAuth } from '@/context/AuthContext';
import { deleteComment } from '@/services/supabaseDataService';
import { Comment } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TreeCommentProps {
  comment: Comment;
  onUpdate?: () => void;
  depth?: number;
  replies?: Comment[];
  onReply?: (commentId: string) => void;
}

export function TreeComment({ comment, onUpdate, depth = 0, replies = [], onReply }: TreeCommentProps) {
  const { user, isAdmin } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  
  const isAuthor = user?.id === comment.userId;
  const canDelete = isAuthor || isAdmin;
  const indent = depth * 12; // 12px per depth level
  
  // Fetch likes count and user's like status
  useState(() => {
    const fetchLikes = async () => {
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', comment.id);
      
      setLikesCount(count || 0);

      if (user) {
        const { data } = await supabase
          .from('comment_likes')
          .select('id')
          .eq('comment_id', comment.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsLiked(!!data);
      }
    };
    
    fetchLikes();
  });
  
  const handleDelete = async () => {
    if (!user || isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await deleteComment(comment.id, user.id, isAdmin);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', user.id);
        
        setLikesCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: comment.id,
            user_id: user.id
          });
        
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        variant: "destructive",
        description: "Failed to update like"
      });
    }
  };
  
  return (
    <div className="relative">
      {/* Connector line for replies */}
      {depth > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-px bg-border"
          style={{ left: `${indent - 6}px` }}
        />
      )}
      
      <div 
        className="py-2 px-2 hover:bg-muted/30 rounded-lg transition-colors"
        style={{ marginLeft: `${indent}px` }}
      >
        <div className="flex items-start gap-2">
          {depth > 0 && (
            <CornerDownRight className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <UsernameDisplay 
                userId={comment.userId} 
                showAvatar={true}
                size="sm"
              />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(
                  typeof comment.timestamp === 'number' ? comment.timestamp : comment.timestamp,
                  { addSuffix: true }
                )}
              </span>
            </div>
            
            <p className="text-sm break-words mb-2">{comment.content}</p>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`h-7 px-2 gap-1 ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
              >
                <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
                {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
              </Button>
              
              {onReply && depth < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment.id)}
                  className="h-7 px-2 gap-1 text-muted-foreground"
                >
                  <Reply className="h-3 w-3" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}
              
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isDeleting}
                      className="h-7 px-2 text-muted-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this comment?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Render replies recursively */}
      {replies.length > 0 && showReplies && (
        <div className="mt-1">
          {replies.map((reply) => (
            <TreeComment
              key={reply.id}
              comment={reply}
              onUpdate={onUpdate}
              depth={depth + 1}
              onReply={onReply}
            />
          ))}
        </div>
      )}
      
      {replies.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReplies(!showReplies)}
          className="ml-2 h-6 px-2 text-xs text-muted-foreground"
          style={{ marginLeft: `${indent + 8}px` }}
        >
          {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </Button>
      )}
    </div>
  );
}