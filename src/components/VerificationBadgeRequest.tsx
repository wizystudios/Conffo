import { useState } from 'react';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface VerificationBadgeRequestProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VerificationBadgeRequest({ isOpen, onClose }: VerificationBadgeRequestProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user already has a pending request
  const { data: existingRequest } = useQuery({
    queryKey: ['verification-request', user?.id],
    queryFn: async () => {
      const saved = localStorage.getItem(`verification_request_${user?.id}`);
      return saved ? JSON.parse(saved) : null;
    },
    enabled: !!user?.id,
  });

  // Check if user is already verified
  const { data: profile } = useQuery({
    queryKey: ['profile-verification', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSubmit = async () => {
    if (!user || !reason.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Store verification request locally (in production, would use a DB table)
      const request = {
        userId: user.id,
        reason: reason.trim(),
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(`verification_request_${user.id}`, JSON.stringify(request));
      
      // Also create a notification for admins (simplified - in production would notify admins differently)
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'verification_request',
        content: 'Your verification request has been submitted for review.',
        is_read: false,
      });
      
      toast({ description: "Verification request submitted!" });
      onClose();
    } catch (error) {
      toast({ variant: "destructive", description: "Failed to submit request" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profile?.is_verified) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Already Verified
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Your account is already verified! The verification badge is displayed on your profile.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  if (existingRequest?.status === 'pending') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Pending</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Your verification request is currently under review. We'll notify you once a decision is made.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Submitted: {new Date(existingRequest.submittedAt).toLocaleDateString()}
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" />
            Request Verification
          </DialogTitle>
          <DialogDescription>
            Verification badges are given to notable accounts. Tell us why you should be verified.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why should your account be verified? (e.g., public figure, brand, notable creator...)"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {reason.length}/500
          </p>
          
          <Button 
            onClick={handleSubmit} 
            disabled={!reason.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <BadgeCheck className="h-4 w-4 mr-2" />
            )}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
