
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { addComment } from '@/services/supabaseDataService';

interface CommentFormProps {
  confessionId: string;
  onSuccess?: () => void;
}

export function CommentForm({ confessionId, onSuccess }: CommentFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user || content.trim() === '' || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await addComment(content, confessionId, user.id);
      setContent('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Add a comment..."
        className="min-h-[80px]"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={content.trim() === '' || isSubmitting}
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
    </form>
  );
}
