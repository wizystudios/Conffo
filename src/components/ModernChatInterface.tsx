import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Image, Paperclip, Smile, Phone, VideoIcon, MoreVertical, ArrowLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { sendMessage, uploadChatMedia } from '@/services/chatService';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ModernMessageBubble } from '@/components/ModernMessageBubble';
import { EmojiPicker } from '@/components/EmojiPicker';


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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Get target user profile and check follow status
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

  // Check if user follows the target user
  const { data: isFollowing } = useQuery({
    queryKey: ['following', user?.id, targetUserId],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();
      return !!data;
    },
    enabled: !!user?.id && !!targetUserId,
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

  // Show restriction message if not following
  if (!isFollowing && user?.id && targetUserId && user.id !== targetUserId && !isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center justify-between p-4 bg-card border-b">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Avatar className="h-10 w-10">
              <AvatarImage src={targetProfile?.avatar_url} />
              <AvatarFallback>
                {targetProfile?.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{targetProfile?.username || 'Unknown User'}</h3>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h2 className="text-xl font-semibold">Follow to Chat</h2>
            <p className="text-muted-foreground max-w-sm">
              You need to follow {targetProfile?.username || 'this user'} to start a conversation.
            </p>
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-11 w-11">
            <AvatarImage src={targetProfile?.avatar_url || targetAvatarUrl} />
            <AvatarFallback>
              {(targetProfile?.username || targetUsername)?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold text-sm">{targetProfile?.username || targetUsername || 'Unknown User'}</h3>
            <p className="text-xs text-muted-foreground">
              {isTyping ? 'Typing...' : 'Team Leader'}
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
                className="h-9 w-9"
              >
                <Phone className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCall('video')}
                className="h-9 w-9"
              >
                <VideoIcon className="h-5 w-5" />
              </Button>
            </>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
      <div className="flex-1 p-4 overflow-y-auto bg-background">
        <div className="space-y-2">
          {messages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);
            
            return (
              <ModernMessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                senderAvatar={targetProfile?.avatar_url || targetAvatarUrl}
                senderName={targetProfile?.username || targetUsername}
              />
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-background border-t">
        <div className="flex items-center gap-2">
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
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Smile className="h-5 w-5" />
          </Button>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message here"
            className="flex-1 rounded-full bg-gray-100 border-0 text-sm px-4 focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(newMessage);
              }
            }}
          />

          <Button
            onClick={() => handleSendMessage(newMessage)}
            disabled={isSending || !newMessage.trim()}
            size="icon"
            className="h-9 w-9 rounded-full bg-transparent hover:bg-transparent text-blue-600 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}