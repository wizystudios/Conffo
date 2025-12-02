import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ModernChatList } from '@/components/ModernChatList';
import { useNavigate } from 'react-router-dom';

export default function ChatListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { unreadCounts } = useUnreadMessages();
  const navigate = useNavigate();

  // Get followed users that you can chat with
  const { data: followedUsers = [], isLoading } = useQuery({
    queryKey: ['followed-users', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First get the user IDs that this user follows
      const { data: follows, error: followsError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;
      
      if (!follows || follows.length === 0) return [];
      
      const followingIds = follows.map(f => f.following_id);
      
      // Then get the profile information for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', followingIds);

      if (profilesError) throw profilesError;

      // Get last messages for each user
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
            ...profile,
            lastMessage,
            lastMessageTime: lastMsg ? new Date(lastMsg.created_at) : undefined
          };
        })
      );

      return usersWithMessages;
    },
    enabled: !!user,
  });

  const filteredUsers = followedUsers.filter(user =>
    user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-7 w-7">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-7 h-7 text-xs rounded-full bg-muted border-0"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0.5 p-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-muted rounded w-1/3 mb-1"></div>
                    <div className="h-2 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <ModernChatList 
            users={filteredUsers.map(u => ({
              ...u,
              unreadCount: unreadCounts[u.id],
              isOnline: true
            }))}
          />
        ) : (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-0.5 text-xs">No conversations yet</p>
              <p className="text-xs">Follow people to start chatting</p>
              <Link to="/browse">
                <Button variant="outline" size="sm" className="mt-3 text-xs h-7">
                  Browse People
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}