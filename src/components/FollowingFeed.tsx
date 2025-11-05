import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { InstagramConfessionCard } from './InstagramConfessionCard';
import { Card } from './ui/card';
import { UserPlus } from 'lucide-react';

export function FollowingFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchFollowingPosts = async () => {
      try {
        // Get users that the current user follows
        const { data: following } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        if (!following || following.length === 0) {
          setPosts([]);
          setIsLoading(false);
          return;
        }

        const followingIds = following.map(f => f.following_id);

        // Get confessions from followed users
        const { data: confessions } = await supabase
          .from('confessions')
          .select('*')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(20);

        setPosts(confessions || []);
      } catch (error) {
        console.error('Error fetching following feed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowingPosts();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2].map((i) => (
          <Card key={i} className="p-3 animate-pulse">
            <div className="h-3 bg-muted rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <UserPlus className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No posts from your crew yet. Start following people to see their posts here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {posts.map((confession) => (
        <InstagramConfessionCard 
          key={confession.id}
          confession={confession}
        />
      ))}
    </div>
  );
}