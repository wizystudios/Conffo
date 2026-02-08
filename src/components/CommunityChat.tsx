import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Mic, Image, MoreVertical, Users, UserPlus, X, Play, Reply, Shield, Crown, Edit, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Community, 
  CommunityMessage, 
  getCommunityMessages, 
  sendCommunityMessage,
  getCommunityMembers,
  getJoinRequests,
  JoinRequest
} from '@/services/communityService';
import { formatDistanceToNow } from 'date-fns';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/utils/hapticFeedback';
import { CommunityEditModal } from '@/components/CommunityEditModal';
import { CommunityTopicsModal } from '@/components/CommunityTopicsModal';

interface CommunityChatProps {
  community: Community;
  onBack: () => void;
  onShowMembers: () => void;
  onAddMembers: () => void;
  onShowRequests?: () => void;
}

export function CommunityChat({ community, onBack, onShowMembers, onAddMembers, onShowRequests }: CommunityChatProps) {
  const { user } = useAuth();
  const chatNavigate = useNavigate();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video'; file: File } | null>(null);
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCreator = community.creatorId === user?.id;
  const canManageRequests = isCreator || isAdmin;

  useEffect(() => {
    loadMessages();
    loadMemberCount();
    loadActiveTopic();
    if (isCreator) loadPendingRequests();
    
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
        
        // Get sender info
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
        
        setMessages(prev => [...prev, message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [community.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    setIsLoading(true);
    const msgs = await getCommunityMessages(community.id);
    setMessages(msgs);
    setIsLoading(false);
  };

  const loadMemberCount = async () => {
    const members = await getCommunityMembers(community.id);
    setMemberCount(members.length);

    const me = members.find((m) => m.userId === user?.id);
    const admin = me?.role === 'creator' || me?.role === 'admin';
    setIsAdmin(!!admin);

    if (admin) {
      await loadPendingRequests();
    } else {
      setPendingRequestsCount(0);
    }
  };

  const loadPendingRequests = async () => {
    const requests = await getJoinRequests(community.id);
    setPendingRequestsCount(requests.length);
  };

  const loadActiveTopic = async () => {
    const { data } = await supabase
      .from('community_topics')
      .select('title')
      .eq('community_id', community.id)
      .eq('is_active', true)
      .maybeSingle();
    
    setActiveTopic(data?.title || null);
  };

  const handleSend = async () => {
    if (!user) return;
    
    if (mediaPreview) {
      await handleSendMedia();
      return;
    }
    
    if (!newMessage.trim()) return;
    
    const content = newMessage.trim();
    setNewMessage('');
    const replyId = replyTo?.id;
    setReplyTo(null);
    
    const result = await sendCommunityMessage(community.id, content, 'text', undefined, undefined, replyId);
    if (!result) {
      toast({ variant: 'destructive', description: 'Failed to send message' });
    } else {
      haptic.light();
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({ variant: 'destructive', description: 'Only images and videos are supported' });
      return;
    }
    
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ variant: 'destructive', description: `File too large. Max ${isVideo ? '50MB' : '10MB'}` });
      return;
    }
    
    const url = URL.createObjectURL(file);
    setMediaPreview({ url, type: isImage ? 'image' : 'video', file });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMedia = async () => {
    if (!user || !mediaPreview) return;
    
    setIsUploading(true);
    
    try {
      const ext = mediaPreview.file.name.split('.').pop() || (mediaPreview.type === 'image' ? 'jpg' : 'mp4');
      const fileName = `${community.id}/${user.id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, mediaPreview.file, { 
          contentType: mediaPreview.file.type,
          cacheControl: '3600'
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      
      const caption = newMessage.trim() || (mediaPreview.type === 'image' ? '📷 Photo' : '🎬 Video');
      const replyId = replyTo?.id;
      setReplyTo(null);
      
      await sendCommunityMessage(community.id, caption, mediaPreview.type, publicUrl, undefined, replyId);
      
      URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
      setNewMessage('');
      haptic.success();
    } catch (error) {
      console.error('Error sending media:', error);
      toast({ variant: 'destructive', description: 'Failed to send media' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleVoiceComplete = async (audioBlob: Blob, duration: number) => {
    if (!user) return;
    
    try {
      const fileName = `${community.id}/${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      const replyId = replyTo?.id;
      setReplyTo(null);
      
      await sendCommunityMessage(community.id, '🎤 Voice message', 'audio', publicUrl, Math.round(duration), replyId);
      setShowVoiceRecorder(false);
      haptic.success();
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({ variant: 'destructive', description: 'Failed to send voice message' });
    }
  };

  const cancelMediaPreview = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
    }
  };

  const handleReply = (msg: CommunityMessage) => {
    setReplyTo(msg);
    haptic.light();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-background">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Avatar className="h-10 w-10">
          <AvatarImage src={community.imageUrl} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {community.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{community.name}</h2>
          <p className="text-xs text-muted-foreground">
            {memberCount} members{activeTopic && ` • 📌 ${activeTopic}`}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <MoreVertical className="h-5 w-5" />
              {canManageRequests && pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onShowMembers}>
              <Users className="h-4 w-4 mr-2" />
              View Members
            </DropdownMenuItem>

            {canManageRequests && (
              <>
                <DropdownMenuItem onClick={onAddMembers}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Members
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Community
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
              </>
            )}

            {/* Topics visible to ALL members */}
            <DropdownMenuItem onClick={() => setShowTopicsModal(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Discussion Topics
            </DropdownMenuItem>

            {canManageRequests && onShowRequests && (
              <DropdownMenuItem onClick={onShowRequests}>
                <Shield className="h-4 w-4 mr-2" />
                Join Requests
                {pendingRequestsCount > 0 && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                    {pendingRequestsCount}
                  </span>
                )}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === user?.id;
            const isSystemMessage = (msg.messageType as string) === 'system';
            
            // System message rendering
            if (isSystemMessage) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                    {msg.content}
                  </div>
                </div>
              );
            }
            
            return (
              <div 
                key={msg.id} 
                className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                onClick={() => !isOwn && handleReply(msg)}
              >
                {!isOwn && (
                  <button onClick={(e) => { e.stopPropagation(); chatNavigate(`/user/${msg.senderId}`); }}>
                    <Avatar className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={msg.senderAvatar} />
                      <AvatarFallback className="text-xs">
                        {msg.senderName?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                )}
                
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <button onClick={(e) => { e.stopPropagation(); chatNavigate(`/user/${msg.senderId}`); }} className="text-xs text-muted-foreground mb-0.5 ml-1 hover:underline text-left">
                      {msg.senderName}
                    </button>
                  )}
                  
                  {/* Reply quote */}
                  {msg.replyToMessage && (
                    <div className={`text-xs px-2 py-1 mb-1 rounded-lg border-l-2 border-primary/50 ${
                      isOwn ? 'bg-primary/10' : 'bg-muted/50'
                    }`}>
                      <p className="text-[10px] text-primary font-medium">{msg.replyToMessage.senderName}</p>
                      <p className="text-muted-foreground line-clamp-1">{msg.replyToMessage.content}</p>
                    </div>
                  )}
                  
                  <div className={`rounded-2xl overflow-hidden ${
                    msg.messageType === 'image' || msg.messageType === 'video' 
                      ? '' 
                      : `px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`
                  }`}>
                    {msg.messageType === 'audio' && msg.mediaUrl ? (
                      <div className={`px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'} rounded-2xl`}>
                        <audio src={msg.mediaUrl} controls className="h-8 max-w-[200px]" />
                      </div>
                    ) : msg.messageType === 'image' && msg.mediaUrl ? (
                      <div className="relative">
                        <img 
                          src={msg.mediaUrl} 
                          alt="" 
                          className="rounded-2xl max-w-[250px] max-h-[300px] object-cover cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); window.open(msg.mediaUrl, '_blank'); }}
                        />
                        {msg.content && !msg.content.startsWith('📷') && (
                          <div className={`px-3 py-1.5 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ) : msg.messageType === 'video' && msg.mediaUrl ? (
                      <div className="relative">
                        <video 
                          src={msg.mediaUrl} 
                          className="rounded-2xl max-w-[250px] max-h-[300px] object-cover"
                          controls
                          playsInline
                          onClick={(e) => e.stopPropagation()}
                        />
                        {msg.content && !msg.content.startsWith('🎬') && (
                          <div className={`px-3 py-1.5 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-0.5 ml-1">
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </p>
                    {!isOwn && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleReply(msg); }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-3 py-2 border-t border-border bg-muted/50 flex items-center gap-2">
          <Reply className="h-4 w-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">{replyTo.senderName}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{replyTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Media Preview */}
      {mediaPreview && (
        <div className="p-3 border-t border-border bg-muted/50">
          <div className="relative inline-block">
            {mediaPreview.type === 'image' ? (
              <img 
                src={mediaPreview.url} 
                alt="Preview" 
                className="h-20 w-20 object-cover rounded-lg"
              />
            ) : (
              <div className="relative h-20 w-20">
                <video 
                  src={mediaPreview.url} 
                  className="h-20 w-20 object-cover rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                  <Play className="h-6 w-6 text-white" fill="white" />
                </div>
              </div>
            )}
            <button
              onClick={cancelMediaPreview}
              className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border bg-background">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onRecordingComplete={handleVoiceComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-10 w-10 rounded-full flex-shrink-0"
            >
              <Image className="h-5 w-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={mediaPreview ? "Add a caption..." : replyTo ? `Reply to ${replyTo.senderName}...` : "Message..."}
              className="flex-1 rounded-full bg-muted border-0"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
            
            {!mediaPreview && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowVoiceRecorder(true)}
                className="h-10 w-10 rounded-full flex-shrink-0"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
            
            <Button
              variant="default"
              size="icon"
              onClick={handleSend}
              disabled={(!newMessage.trim() && !mediaPreview) || isUploading}
              className="h-10 w-10 rounded-full flex-shrink-0"
            >
              {isUploading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}
      </div>
      
      {/* Edit Community Modal */}
      <CommunityEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        community={community}
        onUpdated={() => {}}
      />
      
      {/* Topics Modal */}
      <CommunityTopicsModal
        isOpen={showTopicsModal}
        onClose={() => setShowTopicsModal(false)}
        communityId={community.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}