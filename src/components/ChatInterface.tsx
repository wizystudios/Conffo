import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Image, Video, Mic, Phone, VideoIcon, MoreVertical, ArrowLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { sendMessage, uploadChatMedia } from '@/services/chatService';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
}

interface ChatInterfaceProps {
  targetUserId: string;
  targetUsername?: string;
  targetAvatarUrl?: string;
  onBack?: () => void;
  onCall?: (type: 'audio' | 'video') => void;
}

export function ChatInterface({
  targetUserId,
  targetUsername,
  targetAvatarUrl,
  onBack,
  onCall
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const { messages, isLoading } = useRealTimeChat(targetUserId);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get target user profile
  const { data: targetProfile } = useQuery({
    queryKey: ['profile', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', targetUserId)
        .single();
      return data;
    },
    enabled: !!targetUserId,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'video' | 'audio' = 'text', mediaUrl?: string, mediaDuration?: number) => {
    if (!user || !content.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(targetUserId, content, type, mediaUrl, mediaDuration);
      setNewMessage('');
      toast({
        description: "Message sent"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const maxSize = 30 * 1024 * 1024; // 30MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Files must be under 30MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (isVideo) {
      // Check video duration (max 30 seconds)
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = async () => {
        if (video.duration > 30) {
          toast({
            title: "Video too long",
            description: "Videos must be 30 seconds or less",
            variant: "destructive"
          });
          return;
        }
        
        // Upload and send video
        try {
          const url = await uploadChatMedia(file, 'video');
          handleSendMessage(file.name, 'video', url, video.duration);
        } catch (error) {
          toast({
            title: "Upload failed",
            description: "Could not upload video",
            variant: "destructive"
          });
        }
      };
      
      video.src = URL.createObjectURL(file);
    } else if (isImage) {
      try {
        const url = await uploadChatMedia(file, 'image');
        handleSendMessage(file.name, 'image', url);
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Could not upload image",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Unsupported file type",
        description: "Only images and videos are supported",
        variant: "destructive"
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], 'audio.wav', { type: 'audio/wav' });
        
        try {
          const url = await uploadChatMedia(file, 'audio');
          handleSendMessage(`Audio message (${Math.floor(recordingTime)}s)`, 'audio', url, Math.floor(recordingTime));
        } catch (error) {
          toast({
            title: "Upload failed",
            description: "Could not upload audio",
            variant: "destructive"
          });
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 0.1;
        });
      }, 100);
    } catch (error) {
      toast({
        title: "Recording failed",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10">
            <AvatarImage src={targetProfile?.avatar_url || targetAvatarUrl} />
            <AvatarFallback>{(targetProfile?.username || targetUsername)?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold">{targetProfile?.username || targetUsername || 'Unknown User'}</h3>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onCall && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCall('audio')}
              >
                <Phone className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCall('video')}
              >
                <VideoIcon className="h-5 w-5" />
              </Button>
            </>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Block User</DropdownMenuItem>
              <DropdownMenuItem>Report</DropdownMenuItem>
              <DropdownMenuItem>Clear Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-muted animate-pulse">
                  <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.message_type === 'text' ? (
                    <p className="text-sm">{message.content}</p>
                  ) : message.message_type === 'image' ? (
                    <div>
                      <img
                        src={message.media_url}
                        alt="Shared image"
                        className="rounded max-w-full h-auto mb-1"
                      />
                      <p className="text-xs opacity-75">{message.content}</p>
                    </div>
                  ) : message.message_type === 'video' ? (
                    <div>
                      <video
                        src={message.media_url}
                        controls
                        className="rounded max-w-full h-auto mb-1"
                      />
                      <p className="text-xs opacity-75">{message.content}</p>
                    </div>
                  ) : message.message_type === 'audio' ? (
                    <div>
                      <audio
                        src={message.media_url}
                        controls
                        className="mb-1"
                      />
                      <p className="text-xs opacity-75">{message.content}</p>
                    </div>
                  ) : null}
                  
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            accept="image/*,video/*"
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            className={isRecording ? 'bg-red-500 text-white' : ''}
          >
            <Mic className="h-5 w-5" />
          </Button>

          {isRecording && (
            <div className="text-sm text-red-500 font-mono">
              {Math.floor(recordingTime)}s / 30s
            </div>
          )}

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(newMessage);
              }
            }}
          />

          <Button
            onClick={() => handleSendMessage(newMessage)}
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}