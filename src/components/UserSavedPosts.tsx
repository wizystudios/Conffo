import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { Confession } from '@/types';
import { Bookmark } from 'lucide-react';

interface UserSavedPostsProps {
  userId?: string;
}

export function UserSavedPosts({ userId }: UserSavedPostsProps) {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<Confession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!targetUserId) return;
      
      setIsLoading(true);
      try {
        // Get saved confessions IDs for the user
        const { data: savedConfessions, error: savedError } = await supabase
          .from('saved_confessions')
          .select('confession_id')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (savedError || !savedConfessions?.length) {
          setSavedPosts([]);
          return;
        }

        const confessionIds = savedConfessions.map(sc => sc.confession_id);

        // Get the actual confessions
        const { data: confessions, error: confessionError } = await supabase
          .from('confessions')
          .select(`
            id,
            content,
            created_at,
            updated_at,
            room_id,
            media_url,
            media_type,
            user_id,
            tags
          `)
          .in('id', confessionIds);

        if (confessionError) {
          console.error('Error fetching confessions:', confessionError);
          return;
        }

        if (!confessions) {
          setSavedPosts([]);
          return;
        }

        // Get reaction counts and user reactions for each confession
        const confessionsWithReactions = await Promise.all(
          confessions.map(async (confession) => {
            // Get reactions count
            const { data: reactions } = await supabase
              .from('reactions')
              .select('type')
              .eq('confession_id', confession.id);

            // Get user's reactions
            const { data: userReactions } = await supabase
              .from('reactions')
              .select('type')
              .eq('confession_id', confession.id)
              .eq('user_id', user?.id || '');

            // Get comments count
            const { count: commentCount } = await supabase
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('confession_id', confession.id);

            const reactionCounts = {
              like: reactions?.filter(r => r.type === 'like').length || 0,
              heart: reactions?.filter(r => r.type === 'heart').length || 0,
              laugh: reactions?.filter(r => r.type === 'laugh').length || 0,
              shock: reactions?.filter(r => r.type === 'shock').length || 0,
            };

              return {
                id: confession.id,
                content: confession.content,
                timestamp: new Date(confession.created_at).getTime(),
                room: confession.room_id as any,
                mediaUrl: confession.media_url,
                mediaType: confession.media_type as 'image' | 'video',
                userId: confession.user_id,
                tags: confession.tags || [],
                reactions: reactionCounts,
                userReactions: userReactions?.map(r => r.type) || [],
                commentCount: commentCount || 0,
              } as Confession;
          })
        );

        setSavedPosts(confessionsWithReactions);
      } catch (error) {
        console.error('Error fetching saved posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedPosts();
  }, [targetUserId, user?.id]);

  const handleUpdate = () => {
    // Refetch data when posts are updated
    const fetchData = async () => {
      if (!targetUserId) return;
      
      try {
        const { data: savedConfessions } = await supabase
          .from('saved_confessions')
          .select('confession_id')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (!savedConfessions?.length) {
          setSavedPosts([]);
          return;
        }

        const confessionIds = savedConfessions.map(sc => sc.confession_id);
        const { data: confessions } = await supabase
          .from('confessions')
          .select(`
            id,
            content,
            created_at,
            updated_at,
            room_id,
            media_url,
            media_type,
            user_id,
            tags
          `)
          .in('id', confessionIds);

        if (confessions) {
          const confessionsWithReactions = await Promise.all(
            confessions.map(async (confession) => {
              const { data: reactions } = await supabase
                .from('reactions')
                .select('type')
                .eq('confession_id', confession.id);

              const { data: userReactions } = await supabase
                .from('reactions')
                .select('type')
                .eq('confession_id', confession.id)
                .eq('user_id', user?.id || '');

              const { count: commentCount } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('confession_id', confession.id);

              const reactionCounts = {
                like: reactions?.filter(r => r.type === 'like').length || 0,
                heart: reactions?.filter(r => r.type === 'heart').length || 0,
                laugh: reactions?.filter(r => r.type === 'laugh').length || 0,
                shock: reactions?.filter(r => r.type === 'shock').length || 0,
              };

              return {
                id: confession.id,
                content: confession.content,
                timestamp: new Date(confession.created_at).getTime(),
                room: confession.room_id as any,
                mediaUrl: confession.media_url,
                mediaType: confession.media_type as 'image' | 'video',
                userId: confession.user_id,
                tags: confession.tags || [],
                reactions: reactionCounts,
                userReactions: userReactions?.map(r => r.type) || [],
                commentCount: commentCount || 0,
              } as Confession;
            })
          );

          setSavedPosts(confessionsWithReactions);
        }
      } catch (error) {
        console.error('Error updating saved posts:', error);
      }
    };

    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (savedPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {isOwnProfile ? "You haven't saved any posts yet" : "No saved posts to show"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {savedPosts.map((confession) => (
        <InstagramConfessionCard 
          key={confession.id}
          confession={confession}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}