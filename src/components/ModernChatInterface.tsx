import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Paperclip, ArrowLeft, Mic, Image as ImageIcon, Smile, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { sendMessage, uploadChatMedia, deleteMessage, editMessage, clearConversation, markConversationAsRead } from '@/services/chatService';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ModernMessageBubble } from '@/components/ModernMessageBubble';
import { EmojiPicker } from '@/components/EmojiPicker';
import { ForwardMessageModal } from '@/components/ForwardMessageModal';
import { DeleteMessageDialog } from '@/components/DeleteMessageDialog';
import { ReportDialog } from '@/components/ReportDialog';
import { useNavigate } from 'react-router-dom';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { OnlineIndicator } from '@/components/OnlineIndicator';
import { TypingIndicator } from '@/components/TypingIndicator';
import { hideMessageLocally, isMessageHidden, saveMessagesLocally, deleteMessageLocally } from '@/utils/localChatStorage';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { MediaPreviewModal } from '@/components/MediaPreviewModal';

interface ChatInterfaceProps {
  targetUserId: string;
  targetUsername?: string;
  targetAvatarUrl?: string;
  onBack?: () => void;
  onCall?: (type: 'audio' | 'video') => void;
}

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
  const { isTyping: isTargetTyping, sendTypingEvent } = useTypingIndicator(targetUserId);
  const { isTargetOnline } = useOnlinePresence(targetUserId);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<{ content: string; type: 'text' | 'image' | 'video' | 'audio' | 'file'; mediaUrl?: string } | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ file: File; previewUrl: string } | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);
  const navigate = useNavigate();

  // Mark messages as read when opening the chat
  useEffect(() => {
    if (targetUserId && user?.id) {
      markConversationAsRead(targetUserId).catch(console.error);
    }
  }, [targetUserId, user?.id]);

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

  useEffect(() => {
    const visibleMessages = messages.filter(m => !isMessageHidden(m.id));
    if (visibleMessages.length !== messages.length) {
      setMessages(visibleMessages);
    }
    
    if (messages.length > lastMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender_id !== user?.id) {
        playReceiveSound();
      }
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, user?.id, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    if (messages.length > 0 && user) {
      markAsRead(targetUserId);
    }
  }, [messages, user, targetUserId, markAsRead]);

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text', mediaUrl?: string, mediaDuration?: number) => {
    if (!user || !content.trim() || isSending) return;

    setIsSending(true);
    try {
      const newMsg = await sendMessage(targetUserId, content, type, mediaUrl, mediaDuration);
      setMessages(prev => {
        if (prev.find(msg => msg.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setNewMessage('');
      playSendSound();
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "Message could not be delivered",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Files must be under 50MB",
        variant: "destructive"
      });
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (isImage || isVideo) {
      // Show preview modal for images/videos
      const previewUrl = URL.createObjectURL(file);
      setPendingMedia({ file, previewUrl });
      setShowMediaPreview(true);
    } else if (isAudio) {
      // Send audio directly
      handleSendMedia(file, 'audio');
    }
  };

  const handleSendMedia = async (file: File, type: 'image' | 'video' | 'audio', caption?: string) => {
    setIsSending(true);
    try {
      const url = await uploadChatMedia(file, type);
      const content = caption?.trim() || file.name;
      await handleSendMessage(content, type, url);
    } catch (error) {
      toast({
        title: "Upload failed",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaSend = async (caption: string) => {
    if (!pendingMedia) return;
    
    const { file, previewUrl } = pendingMedia;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    await handleSendMedia(file, isImage ? 'image' : 'video', caption);
    
    // Clean up
    URL.revokeObjectURL(previewUrl);
    setPendingMedia(null);
    setShowMediaPreview(false);
  };

  const handleDeleteForMe = async () => {
    if (!deleteMessageId || !user) return;
    hideMessageLocally(deleteMessageId);
    setMessages(prev => prev.filter(m => m.id !== deleteMessageId));
    setDeleteMessageId(null);
  };

  const handleDeleteForEveryone = async () => {
    if (!deleteMessageId || !user) return;
    try {
      await deleteMessage(deleteMessageId, true);
      deleteMessageLocally(user.id, targetUserId, deleteMessageId);
      setMessages(prev => prev.map(m => 
        m.id === deleteMessageId 
          ? { ...m, content: 'This message was deleted', message_type: 'text' as const, media_url: undefined }
          : m
      ));
    } catch (error) {
      hideMessageLocally(deleteMessageId);
      setMessages(prev => prev.filter(m => m.id !== deleteMessageId));
    }
    setDeleteMessageId(null);
  };

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear this chat?')) return;
    try {
      await clearConversation(targetUserId);
      setMessages([]);
      toast({ title: "Chat cleared" });
    } catch (error) {
      toast({ title: "Failed to clear chat", variant: "destructive" });
    }
  };

  if (!isFollowing && user?.id && targetUserId && user.id !== targetUserId && !isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center gap-3 p-4 bg-background border-b">
          <Button variant="ghost" size="icon" onClick={onBack || (() => navigate('/chat'))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={targetProfile?.avatar_url} />
            <AvatarFallback>{targetProfile?.username?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <span className="font-semibold">{targetProfile?.username || 'Unknown'}</span>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h2 className="text-xl font-semibold">Follow to Chat</h2>
            <p className="text-muted-foreground max-w-sm">
              You need to follow {targetProfile?.username || 'this user'} to start a conversation.
            </p>
            <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = targetProfile?.username || targetUsername || 'Unknown';
  const displayAvatar = targetProfile?.avatar_url || targetAvatarUrl;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header - Clean Instagram style */}
      <div className="flex items-center justify-between px-3 py-2 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack || (() => navigate('/chat'))} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <button 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => navigate(`/user/${targetUserId}`)}
          >
            <div className="relative">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={displayAvatar || `https://api.dicebear.com/7.x/micah/svg?seed=${targetUserId}`} />
                <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <OnlineIndicator isOnline={isTargetOnline} size="sm" className="bottom-0 right-0" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-sm">{displayName}</h3>
              {isTargetOnline && <span className="text-xs text-green-500">Active now</span>}
            </div>
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/user/${targetUserId}`)}>View Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={handleClearChat} className="text-destructive">Clear Chat</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages - with proper scroll */}
      <div className="flex-1 overflow-y-auto px-4 py-2 bg-background overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {editingMessageId ? (
          <div className="fixed bottom-20 left-0 right-0 bg-background border-t p-4 shadow-lg z-20">
            <div className="max-w-2xl mx-auto flex gap-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Edit message..."
                className="flex-1"
                autoFocus
              />
              <Button onClick={async () => {
                if (!editingMessageId || !editContent.trim()) return;
                try {
                  await editMessage(editingMessageId, editContent);
                  setMessages(prev => prev.map(m => 
                    m.id === editingMessageId 
                      ? { ...m, content: editContent, updated_at: new Date().toISOString() }
                      : m
                  ));
                  setEditingMessageId(null);
                  setEditContent('');
                  toast({ title: "Message updated" });
                } catch (error) {
                  toast({ title: "Failed to update", variant: "destructive" });
                }
              }}>Save</Button>
              <Button variant="outline" onClick={() => { setEditingMessageId(null); setEditContent(''); }}>Cancel</Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-1">
          {messages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);
            
            return (
              <ModernMessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                senderAvatar={displayAvatar}
                senderName={displayName}
                onDelete={() => setDeleteMessageId(message.id)}
                onEdit={() => { setEditingMessageId(message.id); setEditContent(message.content); }}
                onForward={() => {
                  setForwardMessage({
                    content: message.content,
                    type: message.message_type,
                    mediaUrl: message.media_url
                  });
                  setShowForwardModal(true);
                }}
                onReport={() => {
                  setReportMessageId(message.id);
                  setShowReportDialog(true);
                }}
              />
            );
          })}
        </div>
        {isTargetTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Instagram style */}
      <div className="p-3 bg-background border-t border-border">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onRecordingComplete={async (audioBlob, duration) => {
              try {
                setIsSending(true);
                const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                const mediaUrl = await uploadChatMedia(file, 'audio');
                await sendMessage(targetUserId, 'Voice message', 'audio', mediaUrl, duration);
                playSendSound();
                setShowVoiceRecorder(false);
              } catch (error) {
                console.error('Error sending voice message:', error);
                toast({ title: 'Failed to send voice message', variant: 'destructive' });
              } finally {
                setIsSending(false);
              }
            }}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = '';
                }}
                accept="image/*,video/*,audio/*"
                className="hidden"
              />
              
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-5 w-5 text-primary" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    sendTypingEvent();
                  }}
                  placeholder="Message..."
                  className="flex-1 border-0 bg-transparent h-8 focus-visible:ring-0 px-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(newMessage);
                    }
                  }}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
              
              {newMessage.trim() ? (
                <Button 
                  onClick={() => handleSendMessage(newMessage)} 
                  disabled={isSending}
                  size="icon"
                  className="h-10 w-10 rounded-full"
                >
                  <Send className="h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-full"
                  onClick={() => setShowVoiceRecorder(true)}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              )}
            </div>
            
            {showEmojiPicker && (
              <div className="mt-2">
                <EmojiPicker onEmojiSelect={(emoji) => {
                  setNewMessage(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <ForwardMessageModal
        open={showForwardModal}
        onOpenChange={setShowForwardModal}
        messageContent={forwardMessage?.content || ''}
        messageType={forwardMessage?.type || 'text'}
        mediaUrl={forwardMessage?.mediaUrl}
      />
      
      <DeleteMessageDialog
        open={!!deleteMessageId}
        onOpenChange={(open) => !open && setDeleteMessageId(null)}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
        isOwn={!!deleteMessageId && messages.find(m => m.id === deleteMessageId)?.sender_id === user?.id}
      />
      
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        itemId={reportMessageId || ''}
        type="confession"
      />

      <MediaPreviewModal
        open={showMediaPreview}
        onOpenChange={(open) => {
          if (!open && pendingMedia) {
            URL.revokeObjectURL(pendingMedia.previewUrl);
            setPendingMedia(null);
          }
          setShowMediaPreview(open);
        }}
        file={pendingMedia?.file || null}
        previewUrl={pendingMedia?.previewUrl || null}
        onSend={handleMediaSend}
        isSending={isSending}
      />
    </div>
  );
}
