import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Image, Video, Mic, Phone, VideoIcon, MoreVertical, ArrowLeft, Paperclip, Smile, Settings } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { sendMessage, uploadChatMedia, Message } from '@/services/chatService';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { MessageSettings } from '@/components/MessageSettings';


interface ChatInterfaceProps {
  targetUserId: string;
  targetUsername?: string;
  targetAvatarUrl?: string;
  onBack?: () => void;
  onCall?: (type: 'audio' | 'video') => void;
}

// Sound effects (base64 encoded short audio)
const playSendSound = () => {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTON2+/Edjn');
  audio.volume = 0.3;
  audio.play().catch(() => {});
};

const playReceiveSound = () => {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBTON2+/Edj');
  audio.volume = 0.4;
  audio.play().catch(() => {});
};

export function ModernChatInterface({
  targetUserId,
  targetUsername,
  targetAvatarUrl,
  onBack,
  onCall
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const { messages, isLoading, setMessages } = useRealTimeChat(targetUserId);
  const { markAsRead } = useUnreadMessages();
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

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

  // Play sound when new message received
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender_id !== user?.id) {
        playReceiveSound();
      }
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, user?.id]);

  useEffect(() => {
    // Only scroll to bottom if user is near the bottom
    const scrollContainer = messagesEndRef.current?.parentElement;
    if (scrollContainer) {
      const isNearBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 100;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    // Mark messages as read when viewing chat
    if (messages.length > 0 && user) {
      markAsRead(targetUserId);
    }
  }, [messages, user, targetUserId, markAsRead]);

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text', mediaUrl?: string, mediaDuration?: number) => {
    if (!user || !content.trim() || isSending) return;

    setIsSending(true);
    try {
      const newMsg = await sendMessage(targetUserId, content, type, mediaUrl, mediaDuration);
      
      // Add message immediately to local state for instant UI update
      setMessages(prev => {
        // Avoid duplicates
        if (prev.find(msg => msg.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg];
      });
      
      setNewMessage('');
      playSendSound();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send",
        description: "Message could not be delivered",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Files must be under 50MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isDocument = file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text');

    if (isVideo) {
      // Check video duration (max 60 seconds)
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = async () => {
        if (video.duration > 60) {
          toast({
            title: "Video too long",
            description: "Videos must be 60 seconds or less",
            variant: "destructive"
          });
          return;
        }
        
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
    } else if (isAudio) {
      try {
        const url = await uploadChatMedia(file, 'audio');
        handleSendMessage(file.name, 'audio', url);
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Could not upload audio",
          variant: "destructive"
        });
      }
    } else if (isDocument) {
      try {
        const url = await uploadChatMedia(file, 'image'); // Use image endpoint for now
        handleSendMessage(file.name, 'file', url);
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Could not upload document",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Unsupported file type",
        description: "Please select an image, video, audio, or document file",
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
          handleSendMessage(`🎤 Voice message (${Math.floor(recordingTime)}s)`, 'audio', url, Math.floor(recordingTime));
        } catch (error) {
          toast({
            title: "Upload failed",
            description: "Could not upload voice message",
            variant: "destructive"
          });
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-background/95">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={targetProfile?.avatar_url || targetAvatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
              {(targetProfile?.username || targetUsername)?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold">{targetProfile?.username || targetUsername || 'Unknown User'}</h3>
            <p className="text-xs text-muted-foreground flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              {isTyping ? 'Typing...' : 'Online'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {onCall && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCall('audio')}
                className="rounded-full hover:bg-muted/50"
              >
                <Phone className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCall('video')}
                className="rounded-full hover:bg-muted/50"
              >
                <VideoIcon className="h-5 w-5" />
              </Button>
            </>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/50">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Message Settings
              </DropdownMenuItem>
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              <DropdownMenuItem>Block User</DropdownMenuItem>
              <DropdownMenuItem>Report</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Clear Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-muted animate-pulse">
                  <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className={`flex max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                    {showAvatar && !isOwn && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={targetProfile?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {targetProfile?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                     {message.message_type === 'text' ? (
                       <div
                         className={`px-4 py-3 rounded-2xl ${
                           isOwn
                             ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-md'
                             : 'bg-muted rounded-bl-md'
                         } shadow-sm`}
                       >
                         <p className="text-sm leading-relaxed">{message.content}</p>
                         <p className={`text-xs mt-2 opacity-60 ${isOwn ? 'text-right' : 'text-left'}`}>
                           {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                     ) : message.message_type === 'image' ? (
                       <div className="space-y-1">
                         <img
                           src={message.media_url}
                           alt="Shared image"
                           className="rounded-2xl max-w-full h-auto max-h-80 object-cover"
                         />
                         <p className={`text-xs opacity-60 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                           {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                     ) : message.message_type === 'video' ? (
                       <div className="space-y-1">
                         <video
                           src={message.media_url}
                           controls
                           className="rounded-2xl max-w-full h-auto max-h-80"
                         />
                         <p className={`text-xs opacity-60 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                           {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                     ) : message.message_type === 'audio' ? (
                       <div
                         className={`px-4 py-3 rounded-2xl ${
                           isOwn
                             ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-md'
                             : 'bg-muted rounded-bl-md'
                         } shadow-sm space-y-2`}
                       >
                         <audio
                           src={message.media_url}
                           controls
                           className="w-full"
                         />
                         <p className="text-xs opacity-75">{message.content}</p>
                         <p className={`text-xs opacity-60 ${isOwn ? 'text-right' : 'text-left'}`}>
                           {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                     ) : message.message_type === 'file' ? (
                       <div
                         className={`px-4 py-3 rounded-2xl ${
                           isOwn
                             ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-md'
                             : 'bg-muted rounded-bl-md'
                         } shadow-sm`}
                       >
                         <div className="flex items-center space-x-2">
                           <Paperclip className="h-4 w-4" />
                           <a 
                             href={message.media_url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-sm hover:underline"
                           >
                             {message.content}
                           </a>
                         </div>
                         <p className={`text-xs mt-2 opacity-60 ${isOwn ? 'text-right' : 'text-left'}`}>
                           {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                     ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-card/80 backdrop-blur-lg border-t border-border/50">
        <div className="flex items-end space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full hover:bg-muted/50 h-10 w-10"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted/50 h-10 w-10"
            >
              <Image className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="pr-12 rounded-full bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(newMessage);
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
              onClick={() => {
                const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '❤️', '🎉', '🔥'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                setNewMessage(prev => prev + randomEmoji);
              }}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex space-x-1">
            {newMessage.trim() ? (
              <Button
                onClick={() => handleSendMessage(newMessage)}
                disabled={isSending}
                size="icon"
                className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                className={`rounded-full h-10 w-10 ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'hover:bg-muted/50'}`}
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>

          {isRecording && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-mono">
              {Math.floor(recordingTime)}s / 60s
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <MessageSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}