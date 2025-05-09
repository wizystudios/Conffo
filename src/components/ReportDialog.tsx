
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { addReport } from '@/services/supabaseDataService';
import { ReportReason } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'confession' | 'comment';
  itemId: string;
}

export function ReportDialog({ open, onOpenChange, type, itemId }: ReportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState<ReportReason>('inappropriate');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!user || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await addReport(type, itemId, reason, details, user.id);
      
      toast({
        title: 'Report Submitted',
        description: 'Thank you for helping keep our community safe.',
      });
      
      setReason('inappropriate');
      setDetails('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {type === 'confession' ? 'Confession' : 'Comment'}</DialogTitle>
          <DialogDescription>
            Let us know why this content is inappropriate or violates our community guidelines.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Select value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offensive">Offensive content</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Details (optional)</label>
            <Textarea
              placeholder="Provide additional details..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
