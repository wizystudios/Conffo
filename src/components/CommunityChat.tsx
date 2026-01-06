import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Mic, Image, MoreVertical, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Community, 
  CommunityMessage, 
  getCommunityMessages, 
  sendCommunityMessage,
  getCommunityMembers,
  CommunityMember
} from '@/services/communityService';
import { formatDistanceToNow } from 'date-fns';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { toast } from '@/hooks/use-toast';

interface CommunityChatProps {
  community: Community;
  onBack: () => void;
  onShowMembers: () => void;
  onAddMembers: () => void;
}

export function CommunityChat({ community, onBack, onShowMembers, onAddMembers }: CommunityChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isCreator = community.creatorId === user?.id;

  useEffect(() => {
    loadMessages();
    loadMemberCount();
    
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
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    
    const content = newMessage.trim();
    setNewMessage('');
    
    const result = await sendCommunityMessage(community.id, content);
    if (!result) {
      toast({ variant: 'destructive', description: 'Failed to send message' });
    }
  };

  const handleVoiceComplete = async (audioBlob: Blob, duration: number) => {
    if (!user) return;
    
    try {
      // Upload audio
      const fileName = `${community.id}/${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      
      await sendCommunityMessage(community.id, '🎤 Voice message', 'audio', publicUrl, Math.round(duration));
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({ variant: 'destructive', description: 'Failed to send voice message' });
    }
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
          <p className="text-xs text-muted-foreground">{memberCount} members</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onShowMembers}>
              <Users className="h-4 w-4 mr-2" />
              View Members
            </DropdownMenuItem>
            {isCreator && (
              <DropdownMenuItem onClick={onAddMembers}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Members
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
            
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={msg.senderAvatar} />
                    <AvatarFallback className="text-xs">
                      {msg.senderName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <p className="text-xs text-muted-foreground mb-0.5 ml-1">{msg.senderName}</p>
                  )}
                  
                  <div className={`rounded-2xl px-3 py-2 ${
                    isOwn 
                      ? 'bg-primary text-primary-foreground rounded-br-sm' 
                      : 'bg-muted rounded-bl-sm'
                  }`}>
                    {msg.messageType === 'audio' && msg.mediaUrl ? (
                      <audio src={msg.mediaUrl} controls className="h-8 max-w-[200px]" />
                    ) : msg.messageType === 'image' && msg.mediaUrl ? (
                      <img src={msg.mediaUrl} alt="" className="rounded-lg max-w-[200px]" />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-1">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onRecordingComplete={handleVoiceComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              className="flex-1 rounded-full bg-muted border-0"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVoiceRecorder(true)}
              className="h-10 w-10 rounded-full"
            >
              <Mic className="h-5 w-5" />
            </Button>
            
            <Button
              variant="default"
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="h-10 w-10 rounded-full"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
