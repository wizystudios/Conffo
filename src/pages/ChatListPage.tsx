import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle, ArrowLeft, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { formatDistanceToNow } from 'date-fns';
import { getBlockedUsers } from '@/services/blockService';
import { getUserCommunities, Community } from '@/services/communityService';
import { CommunityChat } from '@/components/CommunityChat';
import { CommunityMembersList } from '@/components/CommunityMembersList';
import { JoinRequestsModal } from '@/components/JoinRequestsModal';

interface ChatUser {
  id: string;
  username: string;
  avatar_url: string | null;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  isOnline?: boolean;
  type: 'user' | 'community';
  community?: Community;
}

export default function ChatListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated } = useAuth();
  const { unreadCounts } = useUnreadMessages();
  const navigate = useNavigate();
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: getBlockedUsers,
    enabled: !!user?.id,
  });

  const blockedUserIds = blockedUsers.map(b => b.blocked_id);

  // Get communities
  const { data: communities = [] } = useQuery({
    queryKey: ['user-communities', user?.id],
    queryFn: getUserCommunities,
    enabled: !!user?.id,
  });

  const { data: followedUsers = [], isLoading } = useQuery({
    queryKey: ['followed-users', user?.id, blockedUserIds.length],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: follows, error: followsError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;
      if (!follows || follows.length === 0) return [];
      
      const followingIds = follows
        .map(f => f.following_id)
        .filter(id => !blockedUserIds.includes(id));
      
      if (followingIds.length === 0) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', followingIds);

      if (profilesError) throw profilesError;

      const usersWithMessages = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: messages } = await supabase
            .from('messages')
            .select('content, message_type, created_at')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMsg = messages?.[0];
          let lastMessage = '';
          
          if (lastMsg) {
            if (lastMsg.message_type === 'text') lastMessage = lastMsg.content;
            else if (lastMsg.message_type === 'image') lastMessage = '📷 Photo';
            else if (lastMsg.message_type === 'video') lastMessage = '🎥 Video';
            else if (lastMsg.message_type === 'audio') lastMessage = '🎵 Audio';
          }

          return {
            id: profile.id,
            username: profile.username || 'User',
            avatar_url: profile.avatar_url,
            lastMessage,
            lastMessageTime: lastMsg ? new Date(lastMsg.created_at) : undefined,
            unreadCount: unreadCounts[profile.id] || 0,
            type: 'user' as const
          };
        })
      );

      return usersWithMessages;
    },
    enabled: !!user,
  });

  // Combine users and communities
  const allChats: ChatUser[] = [
    ...communities.map(c => ({
      id: c.id,
      username: c.name,
      avatar_url: c.imageUrl || null,
      lastMessage: c.lastMessage,
      lastMessageTime: c.lastMessageTime ? new Date(c.lastMessageTime) : undefined,
      type: 'community' as const,
      community: c
    })),
    ...followedUsers
  ].sort((a, b) => {
    if (!a.lastMessageTime && !b.lastMessageTime) return 0;
    if (!a.lastMessageTime) return 1;
    if (!b.lastMessageTime) return -1;
    return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
  });

  const filteredChats = allChats.filter(c =>
    c.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Please login to view messages</p>
        <Button onClick={() => navigate('/auth')}>Login</Button>
      </div>
    );
  }

  // Full screen community chat
  if (selectedCommunity) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <CommunityChat
          community={selectedCommunity}
          onBack={() => setSelectedCommunity(null)}
          onShowMembers={() => setShowMembers(true)}
          onAddMembers={() => setShowAddMembers(true)}
          onShowRequests={() => setShowRequests(true)}
        />
        <CommunityMembersList
          isOpen={showMembers}
          onClose={() => setShowMembers(false)}
          communityId={selectedCommunity.id}
          creatorId={selectedCommunity.creatorId}
        />
        <CommunityMembersList
          isOpen={showAddMembers}
          onClose={() => setShowAddMembers(false)}
          communityId={selectedCommunity.id}
          creatorId={selectedCommunity.creatorId}
          isAddMode
        />
        <JoinRequestsModal
          isOpen={showRequests}
          onClose={() => setShowRequests(false)}
          communityId={selectedCommunity.id}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-center text-sm mb-4">
              Follow people or join communities to start chatting
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            chat.type === 'community' ? (
              <button 
                key={`community-${chat.id}`}
                onClick={() => setSelectedCommunity(chat.community!)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {chat.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                    <Users className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm">{chat.username}</span>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(chat.lastMessageTime, { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage || 'Start a conversation'}
                  </p>
                </div>
              </button>
            ) : (
              <Link 
                key={chat.id} 
                to={`/chat/${chat.id}`}
                className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={chat.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${chat.id}`} />
                  <AvatarFallback>{chat.username.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm">{chat.username}</span>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(chat.lastMessageTime, { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage || 'Start a conversation'}
                  </p>
                </div>

                {chat.unreadCount && chat.unreadCount > 0 && (
                  <div className="h-5 min-w-5 px-1.5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">
                      {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                    </span>
                  </div>
                )}
              </Link>
            )
          ))
        )}
      </div>
    </div>
  );
}