import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, X, Users, Hash } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { ImmersivePostViewer } from '@/components/ImmersivePostViewer';
import { Confession } from '@/types';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const [immersiveData, setImmersiveData] = useState<{ confessions: Confession[]; startIndex: number } | null>(null);

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

  // Discover content
  const { data: discoverData } = useQuery({
    queryKey: ['discover-content'],
    queryFn: async () => {
      const [usersRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url, bio').not('avatar_url', 'is', null).limit(10),
        supabase.from('confessions').select('id, content, media_url, media_type, room_id, created_at, user_id, rooms(name)')
          .order('created_at', { ascending: false })
          .limit(30),
      ]);
      return {
        users: usersRes.data || [],
        posts: postsRes.data || [],
      };
    },
    staleTime: 60000,
  });

  const mapToConfessions = (posts: any[]): Confession[] => {
    return posts.map((p: any) => ({
      id: p.id,
      content: p.content,
      room: p.room_id as any,
      userId: p.user_id || '',
      timestamp: new Date(p.created_at).getTime(),
      reactions: { like: 0, laugh: 0, shock: 0, heart: 0 },
      commentCount: 0,
      mediaUrl: p.media_url,
      mediaType: p.media_type,
    }));
  };

  const openImmersive = (posts: any[], index: number) => {
    setImmersiveData({ confessions: mapToConfessions(posts), startIndex: index });
  };

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

            {/* Confessions - tap opens immersive */}
            {searchResults.posts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Confessions</p>
                <div className="grid grid-cols-2 gap-1">
                  {searchResults.posts.map((post: any, idx: number) => (
                    <button key={post.id} onClick={() => openImmersive(searchResults.posts, idx)} className="relative aspect-square rounded-sm overflow-hidden bg-muted/50 text-left">
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
                    </button>
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
          /* Discover Grid */
          <div className="mt-2">
            {/* Quick Room Links */}
            <div className="px-4 mb-3 flex gap-2 overflow-x-auto scrollbar-hide">
              {['random', 'relationships', 'work', 'family', 'friends', 'school'].map(r => (
                <Link key={r} to={`/room/${r}`} className="px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium whitespace-nowrap text-muted-foreground hover:bg-muted transition-colors">
                  #{r}
                </Link>
              ))}
            </div>

            {/* People circles */}
            {discoverData?.users && discoverData.users.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground px-4 mb-2 uppercase tracking-wider">People</p>
                <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide pb-2">
                  {discoverData.users.map((u: any) => (
                    <button key={u.id} onClick={() => navigate(`/user/${u.id}`)} className="flex flex-col items-center gap-1 shrink-0 w-16">
                      <div className="p-[2px] rounded-full bg-gradient-to-br from-primary to-primary/60">
                        <Avatar className="h-14 w-14 border-2 border-background">
                          <AvatarImage src={u.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${u.id}`} />
                          <AvatarFallback>{u.username?.charAt(0)?.toUpperCase() || 'A'}</AvatarFallback>
                        </Avatar>
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center">{u.username || 'User'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Discover Grid - tap opens immersive */}
            <div className="px-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Discover</p>
              <div className="grid grid-cols-2 gap-1.5">
                {discoverData?.posts.map((post: any, idx: number) => {
                  const isTall = idx % 3 === 0;
                  return (
                    <button
                      key={post.id}
                      onClick={() => openImmersive(discoverData.posts, idx)}
                      className={`relative rounded-lg overflow-hidden bg-card border border-border/10 text-left ${isTall ? 'row-span-2 aspect-[3/4]' : 'aspect-square'}`}
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
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Immersive Viewer */}
      {immersiveData && (
        <ImmersivePostViewer
          confessions={immersiveData.confessions}
          startIndex={immersiveData.startIndex}
          onClose={() => setImmersiveData(null)}
        />
      )}
    </Layout>
  );
}
