import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { TrendingUp, Hash, Users } from 'lucide-react';

export function DesktopRightSidebar() {
  const { user } = useAuth();

  // Suggested users (people you may know)
  const { data: suggestedUsers = [] } = useQuery({
    queryKey: ['suggested-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: following } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];

      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .neq('id', user.id)
        .not('id', 'in', `(${followingIds.length > 0 ? followingIds.join(',') : 'null'})`)
        .limit(4);

      return data || [];
    },
    enabled: !!user?.id,
  });

  // Trending rooms/tags
  const { data: trendingRooms = [] } = useQuery({
    queryKey: ['trending-rooms'],
    queryFn: async () => {
      const { data } = await supabase
        .from('rooms')
        .select('id, name, description')
        .limit(5);
      return data || [];
    },
  });

  const handleFollow = async (targetUserId: string) => {
    if (!user?.id) return;
    await supabase.from('user_follows').insert({
      follower_id: user.id,
      following_id: targetUserId,
    });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gradient-to-b from-background to-muted/10 border-l border-border/50 py-6 px-5 hidden xl:flex flex-col">
      {/* Trending Topics Card */}
      <div className="bg-muted/30 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Trending Rooms</h3>
        </div>
        <div className="space-y-3">
          {trendingRooms.slice(0, 4).map((room: any) => (
            <Link 
              key={room.id} 
              to={`/room/${room.id}`}
              className="block group"
            >
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium group-hover:text-primary transition-colors">{room.name}</span>
              </div>
              <p className="text-xs text-muted-foreground ml-6 line-clamp-1">{room.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* People You May Know */}
      {suggestedUsers.length > 0 && (
        <div className="bg-muted/30 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">People You May Know</h3>
            </div>
            <Link to="/search" className="text-xs text-primary font-medium hover:underline">
              See All
            </Link>
          </div>

          <div className="space-y-3">
            {suggestedUsers.map((profile: any) => (
              <div key={profile.id} className="flex items-center gap-3">
                <Link to={`/user/${profile.id}`}>
                  <Avatar className="h-10 w-10 ring-2 ring-background">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {profile.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/user/${profile.id}`}>
                    <p className="text-sm font-semibold truncate hover:text-primary transition-colors">
                      {profile.username || 'User'}
                    </p>
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.bio || 'New to Conffo'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFollow(profile.id)}
                  className="h-8 px-4 rounded-xl text-xs font-semibold border-primary/30 hover:bg-primary hover:text-primary-foreground"
                >
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Links - Fixed at bottom */}
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground/70 mb-3">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <span>·</span>
          <span>Help</span>
          <span>·</span>
          <span>Safety</span>
        </div>
        
        <p className="text-[11px] text-muted-foreground/50">
          © 2026 Conffo · Share Your Truth
        </p>
      </div>
    </div>
  );
}
