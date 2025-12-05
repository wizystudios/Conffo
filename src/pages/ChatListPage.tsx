import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle, ArrowLeft, Edit, Camera } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { formatDistanceToNow } from 'date-fns';

interface ChatUser {
  id: string;
  username: string;
  avatar_url: string | null;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  isOnline?: boolean;
}

export default function ChatListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'messages' | 'channels' | 'requests'>('messages');
  const { user, isAuthenticated } = useAuth();
  const { unreadCounts } = useUnreadMessages();
  const navigate = useNavigate();

  // Get user profile
  const { data: userProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get followed users that you can chat with
  const { data: followedUsers = [], isLoading } = useQuery({
    queryKey: ['followed-users', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: follows, error: followsError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;
      
      if (!follows || follows.length === 0) return [];
      
      const followingIds = follows.map(f => f.following_id);
      
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
            if (lastMsg.message_type === 'text') {
              lastMessage = lastMsg.content;
            } else if (lastMsg.message_type === 'image') {
              lastMessage = '📷 Photo';
            } else if (lastMsg.message_type === 'video') {
              lastMessage = '🎥 Video';
            } else if (lastMsg.message_type === 'audio') {
              lastMessage = '🎵 Audio';
            } else if (lastMsg.message_type === 'file') {
              lastMessage = '📄 Document';
            }
          }

          return {
            id: profile.id,
            username: profile.username || 'User',
            avatar_url: profile.avatar_url,
            lastMessage,
            lastMessageTime: lastMsg ? new Date(lastMsg.created_at) : undefined,
            unreadCount: unreadCounts[profile.id] || 0,
            isOnline: Math.random() > 0.5 // Simulated for now
          };
        })
      );

      return usersWithMessages;
    },
    enabled: !!user,
  });

  const filteredUsers = followedUsers.filter(u =>
    u?.username?.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Instagram style */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">{userProfile?.username || 'Messages'}</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Edit className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar */}
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

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['messages', 'channels', 'requests'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Users Stories Bar */}
      <div className="px-4 py-3 border-b border-border overflow-x-auto scrollbar-hide">
        <div className="flex gap-4">
          {/* Your Note */}
          <div className="flex flex-col items-center min-w-[60px]">
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-border">
                <AvatarImage src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${user?.id}`} />
                <AvatarFallback>{userProfile?.username?.charAt(0) || 'Y'}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 h-5 w-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                <span className="text-xs text-primary-foreground">+</span>
              </div>
            </div>
            <span className="text-xs mt-1 text-muted-foreground">Your note</span>
          </div>

          {/* Other users with notes */}
          {filteredUsers.slice(0, 6).map((chatUser) => (
            <div key={chatUser.id} className="flex flex-col items-center min-w-[60px]">
              <Avatar className="h-14 w-14 border-2 border-primary/50">
                <AvatarImage src={chatUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${chatUser.id}`} />
                <AvatarFallback>{chatUser.username.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs mt-1 truncate w-14 text-center">{chatUser.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="divide-y divide-border/30">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-center text-sm mb-4">
              Follow people to start chatting with them
            </p>
            <Link to="/">
              <Button variant="outline">Browse People</Button>
            </Link>
          </div>
        ) : (
          filteredUsers.map((chatUser) => (
            <Link 
              key={chatUser.id} 
              to={`/chat/${chatUser.id}`}
              className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors active:scale-[0.99]"
            >
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={chatUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${chatUser.id}`} />
                  <AvatarFallback>{chatUser.username.charAt(0)}</AvatarFallback>
                </Avatar>
                {chatUser.isOnline && (
                  <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-sm">{chatUser.username}</span>
                  {chatUser.lastMessageTime && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(chatUser.lastMessageTime, { addSuffix: false })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {chatUser.lastMessage || 'Start a conversation'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {chatUser.unreadCount && chatUser.unreadCount > 0 && (
                  <div className="h-5 min-w-5 px-1.5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">
                      {chatUser.unreadCount > 9 ? '9+' : chatUser.unreadCount}
                    </span>
                  </div>
                )}
                <Camera className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
