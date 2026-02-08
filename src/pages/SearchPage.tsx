import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, X, Users, Hash } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Search results
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { users: [], rooms: [], posts: [] };
      const results: any = { users: [], rooms: [], posts: [] };

      const [usersRes, roomsRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url').ilike('username', `%${searchQuery}%`).limit(10),
        supabase.from('rooms').select('id, name, description').ilike('name', `%${searchQuery}%`).limit(6),
        supabase.from('confessions').select('id, content, room_id, created_at, user_id, media_url, media_type, rooms(name)').ilike('content', `%${searchQuery}%`).limit(20),
      ]);

      results.users = usersRes.data || [];
      results.rooms = roomsRes.data || [];
      results.posts = postsRes.data || [];
      return results;
    },
    enabled: searchQuery.length > 0,
    staleTime: 30000,
  });

  // Discover content - popular users and trending posts
  const { data: discoverData } = useQuery({
    queryKey: ['discover-content'],
    queryFn: async () => {
      const [usersRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url, bio').not('avatar_url', 'is', null).limit(10),
        supabase.from('confessions').select('id, content, media_url, media_type, room_id, created_at, user_id, rooms(name)')
          .not('media_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      return {
        users: usersRes.data || [],
        posts: postsRes.data || [],
      };
    },
    staleTime: 60000,
  });

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-20">
        {/* Search Bar */}
        <div className="sticky top-0 z-10 bg-background px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="pl-9 pr-9 h-10 rounded-full bg-muted/50 border-0 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && searchResults ? (
          <div className="px-4 space-y-4 mt-2">
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Users */}
            {searchResults.users.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">People</p>
                <div className="space-y-1">
                  {searchResults.users.map((u: any) => (
                    <Link key={u.id} to={`/user/${u.id}`} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${u.id}`} />
                        <AvatarFallback>{u.username?.charAt(0)?.toUpperCase() || 'A'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{u.username || 'Anonymous'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Rooms */}
            {searchResults.rooms.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Rooms</p>
                <div className="space-y-1">
                  {searchResults.rooms.map((r: any) => (
                    <Link key={r.id} to={`/room/${r.id}`} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">#{r.name}</p>
                        {r.description && <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {searchResults.posts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Confessions</p>
                <div className="grid grid-cols-2 gap-1">
                  {searchResults.posts.map((post: any) => (
                    <Link key={post.id} to={`/confession/${post.id}`} className="relative aspect-square rounded-sm overflow-hidden bg-muted/50">
                      {post.media_url ? (
                        post.media_type === 'video' ? (
                          <video src={post.media_url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full p-3 flex items-center justify-center bg-card border border-border/20">
                          <p className="text-xs text-center line-clamp-4 text-muted-foreground">{post.content}</p>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60">
                        <p className="text-[9px] text-white/80">#{post.rooms?.name || 'room'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {!isLoading && searchResults.users.length === 0 && searchResults.rooms.length === 0 && searchResults.posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No results for "{searchQuery}"</p>
              </div>
            )}
          </div>
        ) : (
          /* Discover - Snapchat-style Grid */
          <div className="mt-2">
            {/* Quick Actions */}
            <div className="px-4 mb-3 flex gap-2 overflow-x-auto scrollbar-hide">
              {['random', 'relationships', 'work', 'family', 'friends', 'school'].map(r => (
                <Link key={r} to={`/room/${r}`} className="px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium whitespace-nowrap text-muted-foreground hover:bg-muted transition-colors">
                  #{r}
                </Link>
              ))}
            </div>

            {/* Friends / Following - horizontal scroll */}
            {discoverData?.users && discoverData.users.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground px-4 mb-2 uppercase tracking-wider">People</p>
                <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide pb-2">
                  {discoverData.users.map((u: any) => (
                    <button key={u.id} onClick={() => navigate(`/user/${u.id}`)} className="flex flex-col items-center gap-1 shrink-0 w-16">
                      <Avatar className="h-14 w-14 border-2 border-border/30">
                        <AvatarImage src={u.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${u.id}`} />
                        <AvatarFallback>{u.username?.charAt(0)?.toUpperCase() || 'A'}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center">{u.username || 'User'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Discover Grid - 2 column masonry-like */}
            <div className="px-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Discover</p>
              <div className="grid grid-cols-2 gap-1.5">
                {discoverData?.posts.map((post: any, idx: number) => {
                  // Alternate between tall and short cards
                  const isTall = idx % 3 === 0;
                  return (
                    <Link 
                      key={post.id} 
                      to={`/confession/${post.id}`}
                      className={`relative rounded-lg overflow-hidden bg-card border border-border/10 ${isTall ? 'row-span-2 aspect-[3/4]' : 'aspect-square'}`}
                    >
                      {post.media_url ? (
                        post.media_type === 'video' ? (
                          <video src={post.media_url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full p-3 flex items-end bg-gradient-to-b from-muted/20 to-muted/60">
                          <p className="text-xs line-clamp-3 font-medium">{post.content}</p>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-[10px] text-white/90 font-medium line-clamp-2">
                          {post.media_url ? post.content?.substring(0, 40) : ''}
                        </p>
                        <p className="text-[9px] text-white/60">#{post.rooms?.name || 'confession'}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
