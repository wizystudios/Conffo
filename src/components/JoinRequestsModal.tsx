import { useState, useEffect } from 'react';
import { X, Check, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getJoinRequests, respondToJoinRequest, JoinRequest } from '@/services/communityService';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/utils/hapticFeedback';
import { formatDistanceToNow } from 'date-fns';

interface JoinRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
}

export function JoinRequestsModal({ isOpen, onClose, communityId }: JoinRequestsModalProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen, communityId]);

  const loadRequests = async () => {
    setIsLoading(true);
    const data = await getJoinRequests(communityId);
    setRequests(data);
    setIsLoading(false);
  };

  const handleRespond = async (requestId: string, approve: boolean) => {
    setProcessingId(requestId);
    
    const success = await respondToJoinRequest(requestId, approve);
    
    if (success) {
      setRequests(prev => prev.filter(r => r.id !== requestId));
      haptic.success();
      toast({ 
        description: approve 
          ? '✅ Request approved! User added to community.' 
          : 'Request declined.' 
      });
    } else {
      toast({ variant: 'destructive', description: 'Failed to process request' });
    }
    
    setProcessingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h2 className="text-lg font-bold">Join Requests</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No pending requests</p>
              <p className="text-xs mt-1">New join requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted/50"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.avatarUrl} />
                    <AvatarFallback>{request.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{request.username}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRespond(request.id, false)}
                      disabled={processingId === request.id}
                      className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => handleRespond(request.id, true)}
                      disabled={processingId === request.id}
                      className="h-9 w-9"
                    >
                      {processingId === request.id ? (
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}