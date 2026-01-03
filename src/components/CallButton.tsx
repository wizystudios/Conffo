import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff } from 'lucide-react';
import { WebRTCService } from '@/services/webRTCService';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CallButtonProps {
  targetUserId: string;
  targetUsername?: string;
  targetAvatarUrl?: string;
  type: 'audio' | 'video';
}

export function CallButton({ targetUserId, targetUsername, targetAvatarUrl, type }: CallButtonProps) {
  const { user } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [durationInterval, setDurationInterval] = useState<NodeJS.Timeout | null>(null);

  const handleStartCall = async () => {
    if (!user) {
      toast({ variant: "destructive", description: "Please sign in to make calls" });
      return;
    }

    try {
      const service = new WebRTCService(
        user.id,
        (stream) => setRemoteStream(stream),
        () => handleEndCall()
      );

      await service.initializeCall(targetUserId, type);
      setWebrtcService(service);
      setLocalStream(service.getLocalStream());
      setIsInCall(true);

      // Start call duration timer
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      setDurationInterval(interval);

      toast({ description: `📞 Calling ${targetUsername || 'user'}...` });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({ variant: "destructive", description: "Failed to start call. Check microphone/camera permissions." });
    }
  };

  const handleEndCall = () => {
    webrtcService?.endCall();
    setWebrtcService(null);
    setRemoteStream(null);
    setLocalStream(null);
    setIsInCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    
    if (durationInterval) {
      clearInterval(durationInterval);
      setDurationInterval(null);
    }
  };

  const handleToggleMute = () => {
    if (webrtcService) {
      const muted = webrtcService.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleToggleVideo = () => {
    if (webrtcService) {
      const videoOff = webrtcService.toggleVideo();
      setIsVideoOff(videoOff);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleStartCall}
        className="h-8 w-8"
        disabled={isInCall}
      >
        {type === 'audio' ? (
          <Phone className="h-4 w-4" />
        ) : (
          <Video className="h-4 w-4" />
        )}
      </Button>

      {/* Call Modal */}
      <Dialog open={isInCall} onOpenChange={(open) => !open && handleEndCall()}>
        <DialogContent className="max-w-sm p-0 bg-gradient-to-b from-gray-900 to-gray-800 text-white border-0">
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            {/* Remote Video */}
            {type === 'video' && remoteStream && (
              <video
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover rounded-lg"
                ref={(video) => {
                  if (video && remoteStream) {
                    video.srcObject = remoteStream;
                  }
                }}
              />
            )}

            {/* Local Video Preview */}
            {type === 'video' && localStream && !isVideoOff && (
              <div className="absolute top-4 right-4 w-24 h-32 rounded-lg overflow-hidden border-2 border-white/30">
                <video
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  ref={(video) => {
                    if (video && localStream) {
                      video.srcObject = localStream;
                    }
                  }}
                />
              </div>
            )}

            {/* Call Info Overlay */}
            <div className="relative z-10 flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4 border-4 border-white/20">
                <AvatarImage src={targetAvatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${targetUserId}`} />
                <AvatarFallback className="bg-primary text-2xl">
                  {(targetUsername || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="text-xl font-semibold mb-1">{targetUsername || 'User'}</h3>
              <p className="text-white/70 text-sm mb-2">
                {type === 'audio' ? 'Voice Call' : 'Video Call'}
              </p>
              <p className="text-white/50 text-lg font-mono">
                {formatDuration(callDuration)}
              </p>
            </div>

            {/* Call Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleToggleMute}
                className={`h-14 w-14 rounded-full ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10'}`}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              {type === 'video' && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleToggleVideo}
                  className={`h-14 w-14 rounded-full ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/10'}`}
                >
                  {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
              )}

              <Button
                variant="destructive"
                size="icon"
                onClick={handleEndCall}
                className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}