
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Confession } from '@/types';
import { updateConfession } from '@/services/supabaseDataService';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ConfessionEditDialogProps {
  confession: Confession;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdate: (confession: Confession) => void;
}

export function ConfessionEditDialog({
  confession,
  isOpen,
  onOpenChange,
  onUpdate
}: ConfessionEditDialogProps) {
  const { user } = useAuth();
  const [content, setContent] = useState(confession.content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id || isSubmitting || content.trim() === '') return;
    
    setIsSubmitting(true);
    try {
      const updatedConfession = await updateConfession(
        confession.id,
        content,
        user.id
      );
      
      if (updatedConfession) {
        onUpdate(updatedConfession);
        onOpenChange(false);
      } else {
        throw new Error("Failed to update confession");
      }
    } catch (error) {
      console.error('Error updating confession:', error);
      toast({
        variant: "destructive",
        description: "Failed to update confession"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Confession</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Edit your confession..."
            className="min-h-[120px]"
          />
        </div>
        
        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting || content.trim() === ''}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
