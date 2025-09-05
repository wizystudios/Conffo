import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { CallSignal, WebRTCService } from '@/services/webRTCService';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface IncomingCallModalProps {
  callSignal: CallSignal | null;
  onAccept: (webRTCService: WebRTCService) => void;
  onDecline: () => void;
}

export function IncomingCallModal({ callSignal, onAccept, onDecline }: IncomingCallModalProps) {
  const { user } = useAuth();
  const [isAnswering, setIsAnswering] = useState(false);

  // Get caller profile
  const { data: callerProfile } = useQuery({
    queryKey: ['profile', callSignal?.from],
    queryFn: async () => {
      if (!callSignal?.from) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', callSignal.from)
        .single();
      return data;
    },
    enabled: !!callSignal?.from,
  });

  const handleAccept = async () => {
    if (!callSignal || !user) return;
    
    setIsAnswering(true);
    try {
      const service = new WebRTCService(
        user.id,
        () => {}, // onRemoteStream will be handled by parent
        () => {} // onCallEnd will be handled by parent
      );
      
      await service.answerCall(callSignal.callId, callSignal);
      onAccept(service);
    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: "Call failed",
        description: "Could not answer the call",
        variant: "destructive"
      });
      onDecline();
    } finally {
      setIsAnswering(false);
    }
  };

  if (!callSignal) return null;

  return (
    <Dialog open={!!callSignal} onOpenChange={onDecline}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Incoming Call</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={callerProfile?.avatar_url} />
            <AvatarFallback className="text-2xl">
              {callerProfile?.username?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold">{callerProfile?.username || 'Unknown User'}</h3>
            <p className="text-muted-foreground">is calling you...</p>
          </div>
          
          <div className="flex items-center space-x-6">
            <Button
              onClick={onDecline}
              size="lg"
              variant="destructive"
              className="rounded-full h-16 w-16"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            
            <Button
              onClick={handleAccept}
              size="lg"
              disabled={isAnswering}
              className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600"
            >
              {isAnswering ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}