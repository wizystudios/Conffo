
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addComment } from '@/services/dataService';
import { useAuth } from '@/context/AuthContext';

interface CommentFormProps {
  confessionId: string;
  onSuccess?: () => void;
}

export function CommentForm({ confessionId, onSuccess }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to log in to post a comment.",
        variant: "destructive"
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty.",
        variant: "destructive"
      });
      return;
    }
    
    if (content.length > 300) {
      toast({
        title: "Error",
        description: "Comment must be 300 characters or less.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      addComment(content.trim(), confessionId, user.id);
      
      setContent('');
      toast({
        title: "Success",
        description: "Your comment has been posted!",
      });
      
      if (onSuccess) {
        onSuccess();
      }
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
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Add a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[80px]"
        maxLength={300}
        required
      />
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {content.length}/300 characters
        </div>
        <Button type="submit" disabled={isSubmitting || !content.trim() || content.length > 300}>
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </form>
  );
}
