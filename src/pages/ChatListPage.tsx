import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, Menu } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ModernChatList } from '@/components/ModernChatList';

export default function ChatListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { unreadCounts } = useUnreadMessages();

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
      return profiles || [];
    },
    enabled: !!user,
  });

  const filteredUsers = followedUsers.filter(user =>
    user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
          <h1 className="text-lg font-bold">Messages</h1>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10 rounded-full bg-muted border-0"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
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
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium mb-1">No conversations yet</p>
                <p className="text-sm">Follow people to start chatting</p>
                <Link to="/browse">
                  <Button variant="outline" size="sm" className="mt-4">
                    Browse People
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}