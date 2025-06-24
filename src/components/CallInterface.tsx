
import { useState } from 'react';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CallInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  targetUserId: string;
  targetUsername?: string;
  targetAvatarUrl?: string;
}

export function CallInterface({ 
  isOpen, 
  onClose, 
  callType, 
  targetUserId, 
  targetUsername, 
  targetAvatarUrl 
}: CallInterfaceProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const handleCall = () => {
    // Simulate connecting
    setIsConnected(true);
    console.log(`Calling user ${targetUserId} via ${callType}`);
  };

  const handleEndCall = () => {
    setIsConnected(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>
            {callType === 'video' ? 'Video Call' : 'Audio Call'} with {targetUsername || 'User'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={targetAvatarUrl || ''} alt={targetUsername || 'User'} />
            <AvatarFallback className="text-2xl">
              {targetUsername?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold">{targetUsername || 'User'}</h3>
            <p className="text-muted-foreground">
              {isConnected ? 'Connected' : 'Calling...'}
            </p>
          </div>
          
          {callType === 'video' && (
            <div className="w-full h-40 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">Video preview</span>
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <>
                <Button
                  onClick={handleCall}
                  size="lg"
                  className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600"
                >
                  {callType === 'video' ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
                </Button>
                <Button
                  onClick={onClose}
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-14 w-14"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  size="lg"
                  variant={isMuted ? "destructive" : "secondary"}
                  className="rounded-full h-12 w-12"
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                
                {callType === 'video' && (
                  <Button
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    size="lg"
                    variant={isVideoOff ? "destructive" : "secondary"}
                    className="rounded-full h-12 w-12"
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </Button>
                )}
                
                <Button
                  onClick={handleEndCall}
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-12 w-12"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
