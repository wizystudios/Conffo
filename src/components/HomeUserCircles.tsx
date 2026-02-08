import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function HomeUserCircles() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: users = [] } = useQuery({
    queryKey: ['home-user-circles', user?.id],
    queryFn: async () => {
      if (!user) {
        // If not logged in, show some active users
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .not('avatar_url', 'is', null)
          .limit(15);
        return data || [];
      }

      // Get user's connections (fans + crew)
      const [{ data: fans }, { data: crew }] = await Promise.all([
        supabase.from('user_follows').select('follower_id').eq('following_id', user.id),
        supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
      ]);

      const ids = new Set<string>();
      fans?.forEach(f => ids.add(f.follower_id));
      crew?.forEach(c => ids.add(c.following_id));
      ids.delete(user.id);

      if (ids.size === 0) {
        // Fallback to active users
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', user.id)
          .not('avatar_url', 'is', null)
          .limit(15);
        return data || [];
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', Array.from(ids))
        .limit(15);
      return data || [];
    },
    staleTime: 60000,
  });

  if (users.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {users.map((u: any) => (
          <button
            key={u.id}
            onClick={() => navigate(`/user/${u.id}`)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="p-0.5 rounded-full bg-gradient-to-br from-primary/60 to-primary/20">
              <Avatar className="h-14 w-14 border-2 border-background">
                <AvatarImage src={u.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${u.id}`} />
                <AvatarFallback className="text-xs">
                  {u.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-16 text-center">
              {u.username || 'User'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
