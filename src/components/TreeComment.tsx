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
import { AudioWaveformPlayer } from './AudioWaveformPlayer';

interface ExtendedComment extends Comment {
  audioUrl?: string;
  audioDuration?: number;
  audioWaveform?: number[];
}

interface TreeCommentProps {
  comment: ExtendedComment;
  onUpdate?: () => void;
  depth?: number;
  replies?: ExtendedComment[];
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
    <div className={`${depth > 0 ? 'ml-4 border-l-2 border-primary/30 pl-2 relative' : ''} py-1.5`}>
      {depth > 0 && (
        <div className="absolute -left-[2px] top-0 h-4 flex items-center">
          <div className="text-primary/50 text-[10px] leading-none">↳</div>
        </div>
      )}
      <div className="flex gap-2">
        <UsernameDisplay 
          userId={comment.userId} 
          showAvatar={true} 
          size="sm"
          linkToProfile={true}
          showStoryIndicator={false}
        />
        <div className="flex-1 min-w-0">
          <div className="bg-muted/30 rounded-lg px-2 py-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(
                  typeof comment.timestamp === 'number' ? comment.timestamp : comment.timestamp,
                  { addSuffix: true }
                )}
              </span>
            </div>
            
            {/* Audio waveform player if comment has audio */}
            {comment.audioUrl && (
              <div className="mt-1 mb-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>🎤</span>
                  <span>Voice comment</span>
                </div>
                <AudioWaveformPlayer 
                  audioUrl={comment.audioUrl}
                  duration={comment.audioDuration || 0}
                  waveform={comment.audioWaveform}
                />
              </div>
            )}
            
            {/* Text content - only show if there's actual text and no audio */}
            {comment.content && !comment.content.startsWith('🎤') && !comment.audioUrl && (
              <p className="text-xs whitespace-pre-wrap break-words">{comment.content}</p>
            )}
          </div>
            
          <div className="flex items-center gap-2 mt-1 text-xs">
            <button
              onClick={handleLike}
              className={`flex items-center gap-0.5 ${isLiked ? 'text-primary font-medium' : 'text-muted-foreground'} hover:text-primary transition-colors`}
            >
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-current animate-heart-pop' : ''}`} />
              <span>{likesCount}</span>
              {likesCount > 0 && <span className="text-[10px]">❤️</span>}
            </button>
            
            {onReply && depth < 3 && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Reply className="h-3 w-3" />
                <span className="text-[10px]">Reply</span>
              </button>
            )}

            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={isDeleting}
                    className="flex items-center gap-0.5 text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="text-[10px]">{isDeleting ? 'Deleting...' : 'Delete'}</span>
                  </button>
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

      {replies.length > 0 && (
        <div className="mt-1">
          {showReplies ? (
            <>
              <button 
                onClick={() => setShowReplies(false)}
                className="text-[10px] text-muted-foreground hover:text-primary mb-1 flex items-center gap-1 ml-6"
              >
                <span>↓</span> Hide {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
              {replies.map((reply) => (
                <TreeComment
                  key={reply.id}
                  comment={reply}
                  onUpdate={onUpdate}
                  depth={depth + 1}
                  onReply={onReply}
                  replies={reply.replies || []}
                />
              ))}
            </>
          ) : (
            <button 
              onClick={() => setShowReplies(true)}
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 ml-6"
            >
              <span>→</span> Show {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}