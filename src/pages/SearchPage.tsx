import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, Hash, Users, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'users' | 'rooms' | 'posts'>('all');

  // Real search data
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', searchQuery, activeFilter],
    queryFn: async () => {
      if (!searchQuery.trim()) return { users: [], rooms: [], posts: [] };
      
      const results = { users: [], rooms: [], posts: [] };
      
      if (activeFilter === 'all' || activeFilter === 'users') {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${searchQuery}%`)
          .limit(5);
        results.users = usersData || [];
      }
      
      if (activeFilter === 'all' || activeFilter === 'rooms') {
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('id, name, description')
          .ilike('name', `%${searchQuery}%`)
          .limit(5);
        results.rooms = roomsData || [];
      }
      
      if (activeFilter === 'all' || activeFilter === 'posts') {
        const { data: postsData } = await supabase
          .from('confessions')
          .select(`
            id, 
            content, 
            room_id,
            created_at, 
            user_id,
            rooms(name)
          `)
          .ilike('content', `%${searchQuery}%`)
          .limit(10);
        results.posts = postsData || [];
      }
      
      return results;
    },
    enabled: searchQuery.length > 0,
    staleTime: 30000,
  });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Search</h1>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search confessions, rooms, or users..."
              className="pl-10 pr-10 h-12 text-base"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={activeFilter === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setActiveFilter('all')}
            className="gap-2"
          >
            All
          </Button>
          <Button 
            variant={activeFilter === 'users' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setActiveFilter('users')}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Users
          </Button>
          <Button 
            variant={activeFilter === 'rooms' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setActiveFilter('rooms')}
            className="gap-2"
          >
            <Hash className="h-4 w-4" />
            Rooms
          </Button>
          <Button 
            variant={activeFilter === 'posts' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setActiveFilter('posts')}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Posts
          </Button>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-4">
            {isLoading ? (
              <Card className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Searching...</span>
                </div>
              </Card>
            ) : searchResults ? (
              <>
                {/* Users Results */}
                {searchResults.users.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Users ({searchResults.users.length})
                    </h3>
                    <div className="space-y-2">
                      {searchResults.users.map((user: any) => (
                        <Link key={user.id} to={`/profile?userId=${user.id}`} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${user.id}`} />
                            <AvatarFallback>
                              {user.username?.charAt(0)?.toUpperCase() || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.username || 'Anonymous'}</span>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Rooms Results */}
                {searchResults.rooms.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Rooms ({searchResults.rooms.length})
                    </h3>
                     <div className="space-y-2">
                       {searchResults.rooms.map((room: any) => (
                         <Link key={room.id} to={`/room/${room.id}`} className="block p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors">
                           <div className="flex items-center justify-between">
                             <div className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                               #{room.name}
                             </div>
                           </div>
                           {room.description && (
                             <p className="text-xs text-muted-foreground mt-1">{room.description}</p>
                           )}
                         </Link>
                       ))}
                     </div>
                  </Card>
                )}

                {/* Posts Results */}
                {searchResults.posts.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Posts ({searchResults.posts.length})
                    </h3>
                     <div className="space-y-3">
                       {searchResults.posts.map((post: any) => (
                         <Link key={post.id} to={`/confession/${post.id}`} className="block p-3 border border-border rounded hover:bg-muted/50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                                #{post.rooms?.name || 'Unknown'}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                            </div>
                           <p className="text-sm line-clamp-2">{post.content}</p>
                         </Link>
                       ))}
                    </div>
                  </Card>
                )}

                {/* No Results */}
                {searchResults.users.length === 0 && searchResults.rooms.length === 0 && searchResults.posts.length === 0 && (
                  <Card className="p-6">
                    <div className="text-center text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No results found for "{searchQuery}"</p>
                      <p className="text-sm mt-1">Try different keywords or check your spelling</p>
                    </div>
                  </Card>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Default content when no search */}
        {!searchQuery && (
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Popular Rooms
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {['general', 'love', 'work', 'family', 'friends', 'school'].map((room) => (
                  <Link key={room} to={`/room/${room}`} className="bg-primary/10 text-primary px-3 py-2 rounded-full text-sm font-medium text-center hover:bg-primary/20 cursor-pointer transition-colors">
                    #{room}
                  </Link>
                ))}
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <h3 className="font-medium text-foreground mb-2">Search for anything</h3>
                <p className="text-sm">Find users, rooms, or confessions</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}