import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Paperclip, ArrowLeft, Mic, Image as ImageIcon, Smile, MoreVertical, Search, RefreshCw, Clock, X, Reply, Users, Crown, Edit, MessageSquare, Palette } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { sendMessage, uploadChatMedia, deleteMessage, editMessage, markConversationAsRead, Message } from '@/services/chatService';
import { sendCommunityMessage, getCommunityMessages, getCommunityMembers, CommunityMessage, Community } from '@/services/communityService';
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
import { hideMessageLocally, isMessageHidden } from '@/utils/localChatStorage';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { MediaPreviewModal } from '@/components/MediaPreviewModal';
import { ReplyPreview } from '@/components/ReplyPreview';
import { MessageSearch } from '@/components/MessageSearch';
import { ScheduleMessageModal } from '@/components/ScheduleMessageModal';
import { QuickReplies } from '@/components/QuickReplies';
import { CommunityEditModal } from '@/components/CommunityEditModal';
import { CommunityTopicsModal } from '@/components/CommunityTopicsModal';
import { ChatWallpaperSettings, getChatWallpaperPreference } from '@/components/ChatWallpaperSettings';
import { haptic } from '@/utils/hapticFeedback';
import { formatDistanceToNow } from 'date-fns';
import { useCommunityReadReceipts } from '@/hooks/useCommunityReadReceipts';

interface UnifiedChatInterfaceProps {
  // For direct messages
  targetUserId?: string;
  targetUsername?: string;
  targetAvatarUrl?: string;
  // For community chats
  community?: Community;
  onShowMembers?: () => void;
  onAddMembers?: () => void;
  onShowRequests?: () => void;
  // Common
  onBack?: () => void;
  // Deep-link to specific message
  highlightMessageId?: string;
}

const playSendSound = () => {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTON2+/Edjn');
  audio.volume = 0.3;
  audio.play().catch(() => {});
};

export function UnifiedChatInterface({
  targetUserId,
  targetUsername,
  targetAvatarUrl,
  community,
  onShowMembers,
  onAddMembers,
  onShowRequests,
  onBack,
  highlightMessageId
}: UnifiedChatInterfaceProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCommunityChat = !!community;
  
  // DM-specific hooks
  const { messages: dmMessages, isLoading: dmLoading, isRefreshing, setMessages: setDmMessages, refresh } = useRealTimeChat(targetUserId || '');
  const { markAsRead } = useUnreadMessages();
  const { isTyping: isTargetTyping, sendTypingEvent } = useTypingIndicator(targetUserId || '');
  const { isTargetOnline } = useOnlinePresence(targetUserId || '');
  
  // Community-specific state
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [isCommunityLoading, setIsCommunityLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  
  // Community read receipts
  const { readReceipts, markMessagesAsRead, fetchReadCounts } = useCommunityReadReceipts(community?.id);
  
  // Shared state
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
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showWallpaperSettings, setShowWallpaperSettings] = useState(false);
  const [wallpaperPref, setWallpaperPref] = useState(getChatWallpaperPreference());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pullStartY = useRef(0);
  const isInitialLoad = useRef(true);

  // Load community data
  useEffect(() => {
    if (!isCommunityChat || !community) return;
    
    const loadCommunityData = async () => {
      setIsCommunityLoading(true);
      const msgs = await getCommunityMessages(community.id);
      setCommunityMessages(msgs);
      
      const members = await getCommunityMembers(community.id);
      setMemberCount(members.length);
      
      const me = members.find((m) => m.userId === user?.id);
      setIsAdmin(me?.role === 'creator' || me?.role === 'admin');
      
      // Load active topic
      const { data } = await supabase
        .from('community_topics')
        .select('title')
        .eq('community_id', community.id)
        .eq('is_active', true)
        .maybeSingle();
      
      setActiveTopic(data?.title || null);
      setIsCommunityLoading(false);
    };
    
    loadCommunityData();
    
    // Subscribe to real-time messages
    const channel = supabase
      .channel(`community-messages-${community.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages',
        filter: `community_id=eq.${community.id}`
      }, async (payload) => {
        const newMsg = payload.new as any;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', newMsg.sender_id)
          .maybeSingle();
        
        const message: CommunityMessage = {
          id: newMsg.id,
          communityId: newMsg.community_id,
          senderId: newMsg.sender_id,
          content: newMsg.content,
          messageType: newMsg.message_type,
          mediaUrl: newMsg.media_url,
          mediaDuration: newMsg.media_duration,
          replyToMessageId: newMsg.reply_to_message_id,
          createdAt: newMsg.created_at,
          senderName: profile?.username || 'Anonymous',
          senderAvatar: profile?.avatar_url
        };
        
        setCommunityMessages(prev => [...prev, message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCommunityChat, community, user?.id]);

  // Scroll to bottom on initial load or to highlighted message
  useEffect(() => {
    const messages = isCommunityChat ? communityMessages : dmMessages;
    if (isInitialLoad.current && messages.length > 0) {
      // If we have a highlightMessageId, scroll to that message instead
      if (highlightMessageId && messageRefs.current[highlightMessageId]) {
        setTimeout(() => {
          messageRefs.current[highlightMessageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedMessageId(highlightMessageId);
          // Clear highlight after 3 seconds
          setTimeout(() => setHighlightedMessageId(null), 3000);
        }, 300);
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }
      isInitialLoad.current = false;
    }
  }, [isCommunityChat ? communityMessages : dmMessages, highlightMessageId]);

  // Mark DM as read
  useEffect(() => {
    if (!isCommunityChat && targetUserId && user?.id) {
      markConversationAsRead(targetUserId).catch(console.error);
    }
  }, [isCommunityChat, targetUserId, user?.id]);

  // Auto-mark community messages as read when scrolling
  useEffect(() => {
    if (!isCommunityChat || !community || !user?.id) return;

    // Mark all visible messages as read when messages load or scroll stops
    const markVisibleAsRead = () => {
      const otherUserMsgIds = communityMessages
        .filter(m => m.senderId !== user.id)
        .map(m => m.id);
      
      if (otherUserMsgIds.length > 0) {
        markMessagesAsRead(otherUserMsgIds);
      }
    };

    // Mark as read on initial load
    if (communityMessages.length > 0) {
      markVisibleAsRead();
    }

    // Also fetch read counts for own messages
    const ownMsgIds = communityMessages
      .filter(m => m.senderId === user.id)
      .map(m => m.id);
    if (ownMsgIds.length > 0) {
      fetchReadCounts(ownMsgIds);
    }
  }, [isCommunityChat, community, communityMessages, user?.id, markMessagesAsRead, fetchReadCounts]);

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
    enabled: !!targetUserId && !isCommunityChat,
  });

  const handleHighlightMessage = useCallback((messageId: string | null) => {
    setHighlightedMessageId(messageId);
    if (messageId && messageRefs.current[messageId]) {
      messageRefs.current[messageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, Math.min(100, currentY - pullStartY.current));
    setPullDistance(distance);
  }, [isPulling]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60) {
      if (!isCommunityChat) {
        await refresh();
      } else if (community) {
        const msgs = await getCommunityMessages(community.id);
        setCommunityMessages(msgs);
      }
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, isCommunityChat, community, refresh]);

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text', mediaUrl?: string, mediaDuration?: number) => {
    if (!user || !content.trim() || isSending) return;

    setIsSending(true);
    haptic.light();
    
    try {
      if (isCommunityChat && community) {
        const replyId = replyToMessage?.id;
        setReplyToMessage(null);
        await sendCommunityMessage(community.id, content, type, mediaUrl, mediaDuration, replyId);
      } else if (targetUserId) {
        const newMsg = await sendMessage(targetUserId, content, type, mediaUrl, mediaDuration, replyToMessage?.id);
        if (replyToMessage) {
          newMsg.reply_to_message = replyToMessage;
        }
        setDmMessages(prev => {
          if (prev.find(msg => msg.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
      
      setNewMessage('');
      setReplyToMessage(null);
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
      const previewUrl = URL.createObjectURL(file);
      setPendingMedia({ file, previewUrl });
      setShowMediaPreview(true);
    } else if (isAudio) {
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
    
    await handleSendMedia(file, isImage ? 'image' : 'video', caption);
    
    URL.revokeObjectURL(previewUrl);
    setPendingMedia(null);
    setShowMediaPreview(false);
  };

  const handleDeleteForMe = async () => {
    if (!deleteMessageId || !user) return;
    hideMessageLocally(deleteMessageId);
    if (!isCommunityChat) {
      setDmMessages(prev => prev.filter(m => m.id !== deleteMessageId));
    } else {
      setCommunityMessages(prev => prev.filter(m => m.id !== deleteMessageId));
    }
    setDeleteMessageId(null);
  };

  const handleDeleteForEveryone = async () => {
    if (!deleteMessageId || !user) return;
    try {
      if (!isCommunityChat) {
        await deleteMessage(deleteMessageId, true);
        setDmMessages(prev => prev.filter(m => m.id !== deleteMessageId));
      } else {
        await supabase.from('community_messages').delete().eq('id', deleteMessageId);
        setCommunityMessages(prev => prev.filter(m => m.id !== deleteMessageId));
      }
    } catch (error) {
      hideMessageLocally(deleteMessageId);
      if (!isCommunityChat) {
        setDmMessages(prev => prev.filter(m => m.id !== deleteMessageId));
      } else {
        setCommunityMessages(prev => prev.filter(m => m.id !== deleteMessageId));
      }
    }
    setDeleteMessageId(null);
  };

  const handleVoiceComplete = async (audioBlob: Blob, duration: number) => {
    try {
      setIsSending(true);
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const mediaUrl = await uploadChatMedia(file, 'audio');
      await handleSendMessage('Voice message', 'audio', mediaUrl, duration);
      setShowVoiceRecorder(false);
    } catch (error) {
      toast({ title: 'Failed to send voice message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const isLoading = isCommunityChat ? isCommunityLoading : dmLoading;
  const messages = (isCommunityChat ? communityMessages : dmMessages) as any[];
  
  // Display info
  const displayName = isCommunityChat 
    ? community?.name 
    : (targetProfile?.username || targetUsername || 'Unknown');
  const displayAvatar = isCommunityChat 
    ? community?.imageUrl 
    : (targetProfile?.avatar_url || targetAvatarUrl);

  return (
    <div 
      className="flex flex-col h-screen relative"
      style={{
        ...((wallpaperPref.type === 'custom' || wallpaperPref.type === 'gallery') ? {
          backgroundImage: `url(${wallpaperPref.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        } : {
          backgroundColor: 'hsl(var(--background))',
        }),
      }}
    >
      {/* Header - redesigned with accent line */}
      <div className="bg-background/80 backdrop-blur-md border-b border-border/30">
        {/* Accent line at top */}
        <div className="h-[2px] bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        
        <div className="flex flex-col items-center pt-3 pb-2">
          <button 
            className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => {
              if (!isCommunityChat && targetUserId) {
                navigate(`/user/${targetUserId}`);
              }
            }}
          >
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={displayAvatar || `https://api.dicebear.com/7.x/micah/svg?seed=${isCommunityChat ? community?.id : targetUserId}`} />
                <AvatarFallback>{displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              {!isCommunityChat && <OnlineIndicator isOnline={isTargetOnline} size="sm" className="bottom-0 right-0" />}
              {isCommunityChat && (
                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                  <Users className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <h3 className="font-semibold text-xs">{displayName}</h3>
            {isCommunityChat && (
              <span className="text-[10px] text-muted-foreground">
                {memberCount} members{activeTopic && ` • 📌 ${activeTopic}`}
              </span>
            )}
            {!isCommunityChat && isTargetOnline && <span className="text-[10px] text-primary">Active now</span>}
          </button>
          
          <div className="flex items-center gap-4 mt-1.5">
            <Button variant="ghost" size="icon" onClick={onBack || (() => navigate('/chat'))} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isCommunityChat && (
                  <DropdownMenuItem onClick={() => navigate(`/user/${targetUserId}`)}>View Profile</DropdownMenuItem>
                )}
                {isCommunityChat && (
                  <>
                    <DropdownMenuItem onClick={onShowMembers}>
                      <Users className="h-4 w-4 mr-2" />
                      View Members
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={onAddMembers}>Add Members</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Community
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onShowRequests}>Join Requests</DropdownMenuItem>
                      </>
                    )}
                    {/* Topics visible to all members */}
                    <DropdownMenuItem onClick={() => setShowTopicsModal(true)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Discussion Topics
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowWallpaperSettings(true)}>
                  <Palette className="h-4 w-4 mr-2" />
                  Chat Wallpaper
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {!isCommunityChat && (
        <MessageSearch
          messages={dmMessages}
          onHighlightMessage={handleHighlightMessage}
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Messages area - transparent so wallpaper from parent shows through */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 overscroll-contain touch-pan-y relative" 
        style={{ 
          WebkitOverflowScrolling: 'touch',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {(pullDistance > 0 || isRefreshing) && (
          <div 
            className="flex items-center justify-center py-2 transition-all duration-200"
            style={{ height: isRefreshing ? 40 : pullDistance * 0.4 }}
          >
            <RefreshCw 
              className={`h-5 w-5 text-muted-foreground transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullDistance * 3.6}deg)` }}
            />
            <span className="ml-2 text-xs text-muted-foreground">
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message: any, index: number) => {
              const msgSenderId = message.senderId || message.sender_id;
              const isOwn = msgSenderId === user?.id;
              const isSystemMessage = message.messageType === 'system' || message.message_type === 'system';
              const prevMsg = messages[index - 1] as any;
              const prevMsgSenderId = prevMsg?.senderId || prevMsg?.sender_id;
              const showAvatar = !isOwn && (index === 0 || prevMsgSenderId !== msgSenderId);
              
              const replyMsg = isCommunityChat 
                ? (message.replyToMessageId ? messages.find((m: any) => m.id === message.replyToMessageId) : null)
                : (message.reply_to_message_id 
                    ? messages.find((m: any) => m.id === message.reply_to_message_id) || message.reply_to_message
                    : undefined);
              
              const isHighlighted = highlightedMessageId === message.id;
              
              if (isSystemMessage) {
                return (
                  <div key={message.id} className="flex justify-center my-2">
                    <div className="px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                      {message.content}
                    </div>
                  </div>
                );
              }
              
              // All messages (DM and community) use ModernMessageBubble for consistent UX
              return (
                <div 
                  key={message.id}
                  ref={(el) => { messageRefs.current[message.id] = el; }}
                  className={`transition-all duration-300 ${isHighlighted ? 'bg-primary/20 rounded-lg' : ''}`}
                >
                  <ModernMessageBubble
                    message={isCommunityChat ? {
                      id: message.id,
                      sender_id: message.senderId,
                      receiver_id: '',
                      content: message.content,
                      message_type: message.messageType,
                      media_url: message.mediaUrl,
                      media_duration: message.mediaDuration,
                      created_at: message.createdAt,
                      updated_at: message.createdAt,
                      is_read: true
                    } : message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    senderAvatar={isCommunityChat ? message.senderAvatar : displayAvatar}
                    senderName={isCommunityChat ? message.senderName : displayName}
                    showSenderName={isCommunityChat && !isOwn && showAvatar}
                    isCommunityMessage={isCommunityChat}
                    communityReadCount={isCommunityChat && isOwn ? readReceipts[message.id] : undefined}
                    onDelete={() => setDeleteMessageId(message.id)}
                    onEdit={() => { 
                      if (!isCommunityChat) {
                        setEditingMessageId(message.id); 
                        setEditContent(message.content); 
                      }
                    }}
                    onForward={() => {
                      setForwardMessage({
                        content: message.content,
                        type: isCommunityChat ? message.messageType : message.message_type,
                        mediaUrl: isCommunityChat ? message.mediaUrl : message.media_url
                      });
                      setShowForwardModal(true);
                    }}
                    onReport={() => {
                      setReportMessageId(message.id);
                      setShowReportDialog(true);
                    }}
                    onReply={() => setReplyToMessage(message)}
                    replyToMessage={replyMsg}
                    replyToSenderName={replyMsg ? (
                      isCommunityChat 
                        ? (replyMsg.senderId === user?.id ? 'You' : replyMsg.senderName)
                        : (replyMsg.sender_id === user?.id ? 'You' : displayName)
                    ) : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {!isCommunityChat && isTargetTyping && <TypingIndicator userName={displayName || ''} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-background/80 backdrop-blur-md border-t border-border">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onRecordingComplete={handleVoiceComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <>
            {replyToMessage && (
              <div className="mb-2">
                <ReplyPreview
                  message={isCommunityChat ? {
                    id: replyToMessage.id,
                    sender_id: replyToMessage.senderId,
                    receiver_id: '',
                    content: replyToMessage.content,
                    message_type: replyToMessage.messageType,
                    media_url: replyToMessage.mediaUrl,
                    created_at: replyToMessage.createdAt,
                    updated_at: replyToMessage.createdAt,
                    is_read: true
                  } : replyToMessage}
                  onCancel={() => setReplyToMessage(null)}
                  senderName={isCommunityChat 
                    ? (replyToMessage.senderId === user?.id ? 'You' : replyToMessage.senderName)
                    : (replyToMessage.sender_id === user?.id ? 'You' : displayName || '')}
                  isOwn={isCommunityChat ? replyToMessage.senderId === user?.id : replyToMessage.sender_id === user?.id}
                />
              </div>
            )}
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
              
              <div className="flex-1 flex items-center gap-1 bg-secondary/50 rounded-full px-3 py-1.5 border-0">
                <QuickReplies onSelect={(reply) => setNewMessage(reply)} />
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 text-primary" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (!isCommunityChat) sendTypingEvent();
                  }}
                  placeholder="Message..."
                  className="flex-1 border-0 bg-transparent h-7 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(newMessage);
                    }
                  }}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                  <Smile className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              
              {newMessage.trim() ? (
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setShowScheduleModal(true)}
                    title="Schedule message"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button 
                    onClick={() => handleSendMessage(newMessage)} 
                    disabled={isSending}
                    size="icon"
                    className="h-10 w-10 rounded-full"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
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
        isOwn={!!deleteMessageId && (() => {
          const msg = messages.find((m: any) => m.id === deleteMessageId) as any;
          return (msg?.senderId || msg?.sender_id) === user?.id;
        })()}
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

      <ScheduleMessageModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        messageContent={newMessage}
        onSchedule={(scheduledTime) => {
          const content = newMessage;
          setNewMessage('');
          
          const timeUntilSend = scheduledTime.getTime() - Date.now();
          setTimeout(() => {
            handleSendMessage(content);
          }, timeUntilSend);
        }}
      />

      {isCommunityChat && community && (
        <>
          <CommunityEditModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            community={community}
            onUpdated={() => {}}
          />
          
          <CommunityTopicsModal
            isOpen={showTopicsModal}
            onClose={() => setShowTopicsModal(false)}
            communityId={community.id}
            isAdmin={isAdmin}
          />
        </>
      )}

      {/* Wallpaper Settings Modal */}
      <ChatWallpaperSettings
        isOpen={showWallpaperSettings}
        onClose={() => setShowWallpaperSettings(false)}
        onWallpaperChange={(url, pattern) => {
          setWallpaperPref(getChatWallpaperPreference());
        }}
      />
    </div>
  );
}
