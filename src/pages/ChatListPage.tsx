import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Users, UserPlus, Crown, MessageSquarePlus, CheckCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { format, isToday, isYesterday } from 'date-fns';
import { getBlockedUsers } from '@/services/blockService';
import { getUserCommunities, Community } from '@/services/communityService';
import { UnifiedChatInterface } from '@/components/UnifiedChatInterface';
import { CommunityMembersList } from '@/components/CommunityMembersList';
import { JoinRequestsModal } from '@/components/JoinRequestsModal';
import { CreateCommunityModal } from '@/components/CreateCommunityModal';
import { ConnectionsPickerModal } from '@/components/ConnectionsPickerModal';
import { Layout } from '@/components/Layout';
import { WAPageHeader, WAFab } from '@/components/WAPageHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { hasUserBeenViewed } from '@/utils/viewedConfessions';

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
  isCreator?: boolean;
  hasUnseenConfessions?: boolean;
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
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'communities'>('all');

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

  // Check which users have recent confessions (and the latest timestamp per user)
  const { data: usersWithConfessions = {} as Record<string, number> } = useQuery({
    queryKey: ['users-with-confessions'],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('confessions')
        .select('user_id, created_at')
        .not('user_id', 'is', null)
        .gte('created_at', oneDayAgo);
      const map: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        const ts = new Date(c.created_at).getTime();
        if (!map[c.user_id] || ts > map[c.user_id]) map[c.user_id] = ts;
      });
      return map;
    },
    staleTime: 60000,
  });

  const { data: followedUsers = [], isLoading } = useQuery({
    queryKey: ['followed-users', user?.id, blockedUserIds.length],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!follows || follows.length === 0) return [];
      
      const followingIds = follows
        .map(f => f.following_id)
        .filter(id => !blockedUserIds.includes(id));
      
      if (followingIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', followingIds);

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
            type: 'user' as const,
            hasUnseenConfessions: !!usersWithConfessions[profile.id] && !hasUserBeenViewed(profile.id, usersWithConfessions[profile.id]),
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
      community: c,
      isCreator: c.creatorId === user?.id
    })),
    ...followedUsers
  ].sort((a, b) => {
    if (!a.lastMessageTime && !b.lastMessageTime) return 0;
    if (!a.lastMessageTime) return 1;
    if (!b.lastMessageTime) return -1;
    return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
  });

  const refetchCommunities = () => {};

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

  if (selectedCommunity) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <UnifiedChatInterface
          community={selectedCommunity}
          onBack={() => setSelectedCommunity(null)}
          onShowMembers={() => setShowMembers(true)}
          onAddMembers={() => setShowAddMembers(true)}
          onShowRequests={() => setShowRequests(true)}
        />
        <CommunityMembersList isOpen={showMembers} onClose={() => setShowMembers(false)} communityId={selectedCommunity.id} creatorId={selectedCommunity.creatorId} />
        <CommunityMembersList isOpen={showAddMembers} onClose={() => setShowAddMembers(false)} communityId={selectedCommunity.id} creatorId={selectedCommunity.creatorId} isAddMode />
        <JoinRequestsModal isOpen={showRequests} onClose={() => setShowRequests(false)} communityId={selectedCommunity.id} />
      </div>
    );
  }

  const formatChatTime = (d: Date) => {
    if (isToday(d)) return format(d, 'h:mm a').toLowerCase();
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'M/d/yy');
  };

  const visibleChats = filteredChats.filter((c) => {
    if (activeTab === 'communities') return c.type === 'community';
    return true; // 'all'
  });

  const totalUnread = filteredChats.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <Layout>
    <div className="min-h-screen bg-background pb-20 lg:pb-6">
      <WAPageHeader
        title="Chats"
        searchPlaceholder="Search"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        tabs={[
          { id: 'all', label: 'All', badge: totalUnread > 0 },
          { id: 'communities', label: 'Communities' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
      />

      <div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-base mb-1">No conversations yet</h3>
            <p className="text-muted-foreground text-center text-[12px]">
              Tap the green button to start a chat
            </p>
          </div>
        ) : (
          visibleChats.map((chat) => (
            chat.type === 'community' ? (
              <button
                key={`community-${chat.id}`}
                onClick={() => setSelectedCommunity(chat.community!)}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors text-left"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-[52px] w-[52px]">
                    <AvatarImage src={chat.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                      {chat.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                    <Users className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 border-b border-border/40 pb-3 -mb-3">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-[15px] truncate">{chat.username}</span>
                      {chat.isCreator && <Crown className="h-3 w-3 text-yellow-500 shrink-0" />}
                    </div>
                    {chat.lastMessageTime && (
                      <span className="text-[12px] text-muted-foreground shrink-0">
                        {formatChatTime(chat.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground truncate">
                    {chat.lastMessage || 'Start a conversation'}
                  </p>
                </div>
              </button>
            ) : (
              <Link
                key={chat.id}
                to={`/chat/${chat.id}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors"
              >
                <div className="relative shrink-0">
                  <div className={`rounded-full ${chat.hasUnseenConfessions ? 'p-[2px] bg-primary' : ''}`}>
                    <Avatar className={`h-[52px] w-[52px] ${chat.hasUnseenConfessions ? 'border-2 border-background' : ''}`}>
                      <AvatarImage src={chat.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${chat.id}`} />
                      <AvatarFallback className="text-base">{chat.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="flex-1 min-w-0 border-b border-border/40 pb-3 -mb-3">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-semibold text-[15px] truncate">{chat.username}</span>
                    {chat.lastMessageTime && (
                      <span className={`text-[12px] shrink-0 ${chat.unreadCount && chat.unreadCount > 0 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        {formatChatTime(chat.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      <p className="text-[13px] text-muted-foreground truncate">
                        {chat.lastMessage || 'Start a conversation'}
                      </p>
                    </div>
                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <div className="h-5 min-w-5 px-1.5 bg-primary rounded-full flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-bold text-primary-foreground">
                          {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            )
          ))
        )}
      </div>

      {/* Floating green message FAB */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="New chat"
          >
            <MessageSquarePlus className="h-6 w-6" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShowNewMessage(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            New Message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowCreateCommunity(true)} className="gap-2">
            <Users className="h-4 w-4" />
            Create Community
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateCommunityModal
        isOpen={showCreateCommunity}
        onClose={() => setShowCreateCommunity(false)}
        roomId="general"
        onCreated={refetchCommunities}
      />

      <ConnectionsPickerModal
        isOpen={showNewMessage}
        onClose={() => setShowNewMessage(false)}
      />
    </div>
    </Layout>
  );
}
