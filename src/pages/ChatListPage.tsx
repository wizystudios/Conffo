import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle, Phone, Video } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export default function ChatListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

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
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Search */}
        <div className="space-y-4">
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((followedUser) => {
              return (
                <Link key={followedUser.id} to={`/chat/${followedUser.id}`}>
                  <Card className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={followedUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${followedUser.id}`} />
                          <AvatarFallback>
                            {followedUser.username?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background"></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold truncate">{followedUser.username || 'Unknown User'}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Start a conversation
                        </p>
                      </div>
                      
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })
          ) : (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No people to chat with</p>
                <p className="text-sm mt-1">Follow people to start chatting with them</p>
                <Link to="/browse" className="text-primary text-sm hover:underline mt-2 block">
                  Browse and follow people to chat
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}