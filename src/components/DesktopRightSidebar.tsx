import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import wetechLogo from '@/assets/wetech-logo.png';

export function DesktopRightSidebar() {
  const { user } = useAuth();

  // Suggested users (people you may know)
  const { data: suggestedUsers = [] } = useQuery({
    queryKey: ['suggested-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get users the current user is not following
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
        .limit(5);

      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleFollow = async (targetUserId: string) => {
    if (!user?.id) return;
    await supabase.from('user_follows').insert({
      follower_id: user.id,
      following_id: targetUserId,
    });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border py-6 px-5 hidden xl:block">
      {/* Current User Profile */}
      {user && (
        <div className="mb-6">
          <UserProfileQuery userId={user.id} />
        </div>
      )}

      {/* Suggested For You */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-muted-foreground">Suggested for you</span>
          <Link to="/search" className="text-xs font-semibold hover:text-muted-foreground">
            See All
          </Link>
        </div>

        <div className="space-y-3">
          {suggestedUsers.map((profile: any) => (
            <div key={profile.id} className="flex items-center justify-between">
              <Link to={`/user/${profile.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback>{profile.username?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{profile.username || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">Suggested for you</p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFollow(profile.id)}
                className="text-xs text-primary font-semibold h-auto p-0 hover:bg-transparent"
              >
                Follow
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Links */}
      <div className="mt-auto pt-6 border-t border-border">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
          <Link to="/terms" className="hover:underline">Terms</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <span>·</span>
          <span>Help</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>© 2026 Conffo from</span>
          <img src={wetechLogo} alt="WeTech" className="h-4 object-contain" />
        </div>
      </div>
    </div>
  );
}

// Helper component to fetch current user profile
function UserProfileQuery({ userId }: { userId: string }) {
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url, bio')
        .eq('id', userId)
        .single();
      return data;
    },
  });

  if (!profile) return null;

  return (
    <Link to={`/user/${userId}`} className="flex items-center gap-3">
      <Avatar className="h-12 w-12">
        <AvatarImage src={profile.avatar_url || ''} />
        <AvatarFallback>{profile.username?.charAt(0) || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{profile.username || 'User'}</p>
        <p className="text-sm text-muted-foreground truncate">{profile.bio || 'No bio yet'}</p>
      </div>
    </Link>
  );
}
