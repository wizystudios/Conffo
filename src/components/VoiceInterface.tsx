import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Mic, MicOff, Phone, Waves } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VoiceInterfaceProps {
  onSpeakingChange: (speaking: boolean) => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onSpeakingChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleStartConversation = async () => {
    try {
      // For demonstration purposes - would need real-time audio API
      setIsOpen(true);
      setIsConnected(true);
      
      toast({
        title: "Voice Interface Active",
        description: "You can now speak naturally",
      });
    } catch (error) {
      console.error('Error starting voice interface:', error);
      toast({
        title: "Error",
        description: "Could not start voice interface",
        variant: "destructive",
      });
    }
  };

  const handleEndConversation = () => {
    setIsConnected(false);
    setIsOpen(false);
    onSpeakingChange(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={handleStartConversation}
        className="fixed bottom-8 right-8 rounded-full h-16 w-16 shadow-lg"
        size="lg"
      >
        <Mic className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center space-y-6 p-6">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${isListening ? 'animate-pulse' : ''}`}>
              <Waves className="h-16 w-16 text-white" />
            </div>
            {isListening && (
              <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping"></div>
            )}
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Voice Assistant</h3>
            <p className="text-sm text-muted-foreground">
              {isListening ? "Listening..." : "Tap to speak"}
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button
              onClick={toggleMute}
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full h-12 w-12"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            
            <Button
              onClick={handleEndConversation}
              variant="destructive"
              size="lg"
              className="rounded-full h-12 w-12"
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceInterface;