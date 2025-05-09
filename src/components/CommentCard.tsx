
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Trash2 } from 'lucide-react';
import { Comment } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { deleteComment } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
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
import { ReportDialog } from './ReportDialog';

interface CommentCardProps {
  comment: Comment;
  onUpdate?: () => void;
}

export function CommentCard({ comment, onUpdate }: CommentCardProps) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  
  const isAuthor = user?.id === comment.userId;
  const canDelete = isAuthor || isAdmin;
  
  const handleDelete = () => {
    deleteComment(comment.id);
    toast({
      title: "Comment deleted",
      description: "The comment has been removed.",
    });
    if (onUpdate) onUpdate();
  };
  
  return (
    <div className="bg-secondary p-3 rounded-md mb-3 animate-fade-in">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center space-x-2">
          <UsernameDisplay 
            user={{ 
              username: comment.userId === user?.id 
                ? (user?.username || 'You (Anonymous)') 
                : null,
              isAdmin: comment.userId === user?.id ? !!user?.isAdmin : false
            }} 
          />
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
          </span>
        </div>
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canDelete ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this comment? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <DropdownMenuItem onSelect={() => setReportDialogOpen(true)}>
                  Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="text-foreground">{comment.content}</div>
      
      <ReportDialog 
        open={reportDialogOpen} 
        onOpenChange={setReportDialogOpen} 
        type="comment" 
        itemId={comment.id} 
      />
    </div>
  );
}
