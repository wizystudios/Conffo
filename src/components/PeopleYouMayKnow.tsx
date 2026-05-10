import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { PeopleYouMayKnowModal } from '@/components/PeopleYouMayKnowModal';

interface SuggestedUser {
  id: string;
  username: string;
  avatar_url: string | null;
  fans: number;
  crew: number;
}

/**
 * Discover-style rail used on Explore.
 * Renamed from "People you may know" to the Conffo lexicon and now shows
 * each suggestion's Fans + Crew counts so users can decide who to connect with.
 */
export function PeopleYouMayKnow() {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchSuggested = async () => {
      if (!user) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const { data: followingData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const followingIds = followingData?.map(f => f.following_id) || [];

        let q = supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', user.id)
          .limit(6);
        if (followingIds.length > 0) {
          q = q.not('id', 'in', `(${followingIds.join(',')})`);
        }
        const { data: usersData, error } = await q;
        if (error) throw error;

        // Fetch fan + crew counts in parallel for each candidate.
        const enriched = await Promise.all((usersData || []).map(async (u) => {
          const [{ count: fans }, { count: crew }] = await Promise.all([
            supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', u.id),
            supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', u.id),
          ]);
          return {
            id: u.id,
            username: u.username || 'Anonymous',
            avatar_url: u.avatar_url,
            fans: fans || 0,
            crew: crew || 0,
          };
        }));

        if (!cancelled) setSuggestedUsers(enriched);
      } catch (e) {
        console.error('Error fetching suggested users:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchSuggested();
    return () => { cancelled = true; };
  }, [user, refreshKey]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Create your own crew · Be fans of other Confessors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state with refresh
  if (suggestedUsers.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Create your own crew · Be fans of other Confessors
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-1 rounded-full hover:bg-muted active:scale-95 transition-transform"
              aria-label="Refresh suggestions"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No new suggestions right now. Check back soon.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 text-left"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Create your own crew · Be fans of other Confessors
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRefreshKey(k => k + 1)}
                className="p-1 rounded-full hover:bg-muted active:scale-95 transition-transform"
                aria-label="Refresh suggestions"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="p-1 rounded-full hover:bg-muted active:scale-95 transition-transform"
                aria-label="See all"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto -mx-1 px-1">
            {suggestedUsers.slice(0, 6).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-[88px] active:scale-95 transition-transform"
              >
                <Avatar className="h-14 w-14 ring-2 ring-background shadow-sm">
                  <AvatarImage
                    src={u.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${u.id}`}
                    alt={u.username}
                  />
                  <AvatarFallback>{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="text-xs font-medium truncate w-full text-center">{u.username}</p>
                <p className="text-[10px] text-muted-foreground leading-tight text-center">
                  {u.fans} fans · {u.crew} crew
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <PeopleYouMayKnowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
