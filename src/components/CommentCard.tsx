
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

interface CommentCardProps {
  comment: Comment;
  onUpdate?: () => void;
}

export function CommentCard({ comment, onUpdate }: CommentCardProps) {
  const { user, isAdmin } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isAuthor = user?.id === comment.userId;
  const canDelete = isAuthor || isAdmin;
  
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
  
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm">{comment.content}</p>
            
            <div className="flex items-center mt-2 gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
              </span>
              <UsernameDisplay userId={comment.userId} />
            </div>
          </div>
          
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  className="h-7 w-7"
                >
                  <Trash2 className="h-4 w-4" />
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
      </CardContent>
    </Card>
  );
}
