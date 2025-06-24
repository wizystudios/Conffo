
import { useState, useEffect, useRef } from 'react';
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
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = async () => {
    try {
      const constraints = {
        video: callType === 'video',
        audio: true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsConnected(true);
      console.log(`Call started with ${targetUsername}`);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsConnected(false);
    setCallDuration(0);
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>
            {callType === 'video' ? 'Video Call' : 'Audio Call'} - {targetUsername || 'User'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          {!isConnected ? (
            <>
              <Avatar className="h-24 w-24">
                <AvatarImage src={targetAvatarUrl || ''} alt={targetUsername || 'User'} />
                <AvatarFallback className="text-2xl">
                  {targetUsername?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold">{targetUsername || 'User'}</h3>
                <p className="text-muted-foreground">Calling...</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={startCall}
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
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">{targetUsername || 'User'}</h3>
                <p className="text-muted-foreground">{formatDuration(callDuration)}</p>
              </div>
              
              {callType === 'video' && (
                <div className="relative w-full">
                  <video 
                    ref={remoteVideoRef}
                    className="w-full h-40 bg-black rounded-lg"
                    autoPlay
                    playsInline
                  />
                  <video 
                    ref={localVideoRef}
                    className="absolute bottom-2 right-2 w-20 h-16 bg-gray-800 rounded border-2 border-white"
                    autoPlay
                    playsInline
                    muted
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={toggleMute}
                  size="lg"
                  variant={isMuted ? "destructive" : "secondary"}
                  className="rounded-full h-12 w-12"
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                
                {callType === 'video' && (
                  <Button
                    onClick={toggleVideo}
                    size="lg"
                    variant={isVideoOff ? "destructive" : "secondary"}
                    className="rounded-full h-12 w-12"
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </Button>
                )}
                
                <Button
                  onClick={endCall}
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-12 w-12"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
