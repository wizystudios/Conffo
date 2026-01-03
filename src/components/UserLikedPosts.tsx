import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Confession } from '@/types';
import { Heart, Grid3X3, Play } from 'lucide-react';

interface UserLikedPostsProps {
  userId?: string;
}

export function UserLikedPosts({ userId }: UserLikedPostsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likedPosts, setLikedPosts] = useState<Confession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    const fetchLikedPosts = async () => {
      if (!targetUserId) return;
      
      setIsLoading(true);
      try {
        // Get confession IDs that the user has liked/hearted
        const { data: likedReactions, error: reactionsError } = await supabase
          .from('reactions')
          .select('confession_id')
          .eq('user_id', targetUserId)
          .in('type', ['like', 'heart'])
          .order('created_at', { ascending: false });

        if (reactionsError || !likedReactions?.length) {
          setLikedPosts([]);
          return;
        }

        const confessionIds = [...new Set(likedReactions.map(r => r.confession_id))];

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
          setLikedPosts([]);
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

        setLikedPosts(confessionsWithReactions);
      } catch (error) {
        console.error('Error fetching liked posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedPosts();
  }, [targetUserId, user?.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (likedPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {isOwnProfile ? "You haven't liked any confessions yet" : "No liked confessions to show"}
        </p>
      </div>
    );
  }

  // Instagram-style 3-column grid
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {likedPosts.map(confession => {
        const hasMedia = confession.mediaUrl || (confession.mediaUrls && confession.mediaUrls.length > 0);
        const isVideo = confession.mediaType === 'video' || confession.mediaTypes?.[0] === 'video';
        const thumbnailUrl = confession.mediaUrls?.[0] || confession.mediaUrl;
        
        return (
          <div 
            key={confession.id} 
            className="relative aspect-square bg-muted cursor-pointer group overflow-hidden"
            onClick={() => navigate(`/confession/${confession.id}`)}
          >
            {hasMedia && thumbnailUrl ? (
              <>
                {isVideo ? (
                  <video 
                    src={thumbnailUrl} 
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img 
                    src={thumbnailUrl} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                )}
                {isVideo && (
                  <div className="absolute top-2 right-2">
                    <Play className="h-4 w-4 text-white drop-shadow-lg" fill="white" />
                  </div>
                )}
                {confession.mediaUrls && confession.mediaUrls.length > 1 && (
                  <div className="absolute top-2 right-2">
                    <Grid3X3 className="h-4 w-4 text-white drop-shadow-lg" />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-primary/20 to-primary/5">
                <p className="text-xs text-center line-clamp-4 text-foreground/80">
                  {confession.content}
                </p>
              </div>
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" fill="white" />
                <span className="text-sm font-semibold">
                  {Object.values(confession.reactions || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}