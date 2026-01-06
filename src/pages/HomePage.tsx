import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { EnhancedMultimediaForm } from '@/components/EnhancedMultimediaForm';
import { AllUsersBar } from '@/components/AllUsersBar';
import { PeopleYouMayKnow } from '@/components/PeopleYouMayKnow';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FollowingFeed } from '@/components/FollowingFeed';
import { offlineQueue } from '@/utils/offlineQueue';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { RefreshCw } from 'lucide-react';
import { PostSkeleton } from '@/components/PostSkeleton';
import { haptic } from '@/utils/hapticFeedback';
import { Confession } from '@/types';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { StoryCreator } from '@/components/story/StoryCreator';
import { getBlockedUsers, getBlockedByUsers } from '@/services/blockService';

// Transform raw DB data to Confession type
const transformConfession = (raw: any): Confession => {
  const mediaRows = Array.isArray(raw.confession_media)
    ? [...raw.confession_media].sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
      )
    : [];

  const mediaUrls = mediaRows.map((m: any) => m.media_url).filter(Boolean);
  const mediaTypes = mediaRows.map((m: any) => (m.media_type || 'image') as any);

  // Back-compat: some older posts stored JSON in confessions.media_url
  let legacyUrls: string[] = [];
  if (mediaUrls.length === 0 && typeof raw.media_url === 'string' && raw.media_url.startsWith('[')) {
    try {
      legacyUrls = JSON.parse(raw.media_url);
    } catch {
      legacyUrls = [];
    }
  }

  const allUrls = mediaUrls.length > 0 ? mediaUrls : legacyUrls;
  const allTypes = mediaUrls.length > 0
    ? mediaTypes
    : allUrls.map((url) => {
        if (url.match(/\.(mp4|webm|mov)$/i)) return 'video';
        if (url.match(/\.(mp3|wav|ogg|webm)$/i)) return 'audio';
        return 'image';
      });

  return {
    id: raw.id,
    content: raw.content,
    room: raw.room_id,
    userId: raw.user_id,
    timestamp: new Date(raw.created_at).getTime(),
    reactions: { like: 0, laugh: 0, shock: 0, heart: 0 },
    userReactions: [],
    commentCount: 0,
    mediaUrl: allUrls[0] ?? raw.media_url ?? null,
    mediaUrls: allUrls.length > 0 ? allUrls : undefined,
    mediaType: (allTypes[0] ?? raw.media_type) as any,
    mediaTypes: allTypes.length > 0 ? (allTypes as any) : undefined,
    tags: raw.tags || []
  };
};

const HomePage = () => {
  const [activeTab, setActiveTab] = useState<'crew' | 'fans' | 'all'>('all');
  const [showConfessionForm, setShowConfessionForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const observerTarget = useRef(null);
  const REFRESH_THRESHOLD = 80;
  const [showMomentCreator, setShowMomentCreator] = useState(false);

  // Get blocked users to filter them out
  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: getBlockedUsers,
    enabled: !!user?.id,
  });

  const { data: blockedByUsers = [] } = useQuery({
    queryKey: ['blocked-by-users', user?.id],
    queryFn: getBlockedByUsers,
    enabled: !!user?.id,
  });

  // Combine all blocked user IDs (both directions)
  const allBlockedIds = [
    ...blockedUsers.map(b => b.blocked_id),
    ...blockedByUsers.map(b => b.blocker_id)
  ];

  useEffect(() => {
    const handleCreateConfession = () => setShowConfessionForm(true);
    const handleCreateMoment = () => setShowMomentCreator(true);
    
    window.addEventListener('create-confession', handleCreateConfession);
    window.addEventListener('create-moment', handleCreateMoment);
    
    return () => {
      window.removeEventListener('create-confession', handleCreateConfession);
      window.removeEventListener('create-moment', handleCreateMoment);
    };
  }, []);

  // All Posts query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch: refetchRecent, isLoading: isLoadingRecent } = useInfiniteQuery({
    queryKey: ['confessions', 'recent'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('confessions')
        .select(`
          *,
          confession_media (media_url, media_type, order_index)
        `)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + 9);
      
      if (error) throw error;
      return (data || []).map(transformConfession);
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < 10) return undefined;
      return pages.length * 10;
    },
    initialPageParam: 0
  });

  // Filter blocked users from recent confessions
  const recentConfessions = (data?.pages.flatMap(page => page) || [])
    .filter(c => !allBlockedIds.includes(c.userId));

  // Fans Posts query
  const { data: fansData, fetchNextPage: fetchNextFans, hasNextPage: hasNextFans, isFetchingNextPage: isFetchingNextFans, refetch: refetchFans, isLoading: isLoadingFans } = useInfiniteQuery({
    queryKey: ['confessions', 'fans', user?.id],
    enabled: !!user,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];
      
      const { data: followers } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', user.id);
      
      if (!followers || followers.length === 0) return [];
      
      const followerIds = followers.map(f => f.follower_id);
      
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .in('user_id', followerIds)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + 9);
      
      if (error) throw error;
      return (data || []).map(transformConfession);
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < 10) return undefined;
      return pages.length * 10;
    },
    initialPageParam: 0
  });

  // Filter blocked users from fans posts
  const fansPosts = (fansData?.pages.flatMap(page => page) || [])
    .filter(c => !allBlockedIds.includes(c.userId));

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && activeTab === 'all') {
          fetchNextPage();
        } else if (entries[0].isIntersecting && hasNextFans && !isFetchingNextFans && activeTab === 'fans') {
          fetchNextFans();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, hasNextFans, isFetchingNextFans, activeTab, fetchNextPage, fetchNextFans]);

  // Pull to refresh handlers
  const handlePullTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handlePullTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    if (window.scrollY > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY.current) * 0.5);
    if (distance > 0) {
      setPullDistance(Math.min(distance, REFRESH_THRESHOLD * 1.5));
    }
  }, [isRefreshing]);

  const handlePullTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= REFRESH_THRESHOLD && !isRefreshing) {
      haptic.medium();
      setIsRefreshing(true);
      setPullDistance(REFRESH_THRESHOLD);
      
      try {
        await offlineQueue.uploadQueue();
        await refetchRecent();
        await refetchFans();
        haptic.success();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, refetchRecent, refetchFans]);

  // Removed swipe gesture handlers for tabs - users can use tab buttons instead

  const handleManualRefresh = async () => {
    haptic.medium();
    setIsRefreshing(true);
    await offlineQueue.uploadQueue();
    await refetchRecent();
    await refetchFans();
    haptic.success();
    setIsRefreshing(false);
  };

  const handleConfessionSuccess = () => {
    refetchRecent();
    refetchFans();
    setShowConfessionForm(false);
  };

  const handleMomentSuccess = () => {
    setShowMomentCreator(false);
  };

  const handleTabChange = (tab: 'crew' | 'fans' | 'all') => {
    haptic.light();
    setActiveTab(tab);
  };

  return (
    <Layout>
      <OfflineIndicator />
      
      {/* Pull to refresh indicator */}
      <PullToRefreshIndicator 
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        progress={Math.min(pullDistance / REFRESH_THRESHOLD, 1)}
      />
      
      <div
        onTouchStart={handlePullTouchStart}
        onTouchMove={handlePullTouchMove}
        onTouchEnd={handlePullTouchEnd}
      >
        {/* Tab bar with more spacing from logo */}
        <div className="px-2 py-1.5 mt-2">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-7 w-7"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <div className="flex items-center gap-1">
              <Button
                variant={activeTab === 'fans' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('fans')}
                className="h-6 text-xs rounded-full px-3"
              >
                Fans
              </Button>
              <Button
                variant={activeTab === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('all')}
                className="h-6 text-xs rounded-full px-4"
              >
                All
              </Button>
              <Button
                variant={activeTab === 'crew' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('crew')}
                className="h-6 text-xs rounded-full px-3"
              >
                Crew
              </Button>
            </div>
          </div>
        </div>

        <AllUsersBar />

        {isAuthenticated && showConfessionForm && (
          <div className="mx-2 mb-3 p-3 bg-card rounded-2xl shadow-lg border animate-in fade-in slide-in-from-top-2">
            <h2 className="text-base font-semibold mb-3">Share Your Confession</h2>
            <EnhancedMultimediaForm 
              onSuccess={handleConfessionSuccess} 
              onCancel={() => setShowConfessionForm(false)}
            />
          </div>
        )}

        {isAuthenticated && showMomentCreator && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-in fade-in">
            <StoryCreator 
              onSuccess={handleMomentSuccess} 
              onCancel={() => setShowMomentCreator(false)}
            />
          </div>
        )}

        {activeTab === 'crew' ? (
          <FollowingFeed />
        ) : activeTab === 'fans' ? (
          isLoadingFans ? (
            <div className="space-y-0">
              {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
            </div>
          ) : fansPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No posts from your fans yet!
            </div>
          ) : (
            <>
              <div className="space-y-0">
                {fansPosts.map((confession: any, index: number) => (
                  <div key={confession.id}>
                    <InstagramConfessionCard 
                      confession={confession}
                      onUpdate={() => {
                        refetchRecent();
                        refetchFans();
                      }}
                    />
                    {index === 2 && <PeopleYouMayKnow />}
                  </div>
                ))}
              </div>
              {isFetchingNextFans && (
                <div className="space-y-0">
                  {[1, 2].map((i) => <PostSkeleton key={i} />)}
                </div>
              )}
              <div ref={observerTarget} className="h-4" />
            </>
          )
        ) : (
          <>
            {isLoadingRecent ? (
              <div className="space-y-0">
                {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
              </div>
            ) : recentConfessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No confessions yet. Be the first to share!
              </div>
            ) : (
              <>
                <div className="space-y-0">
                  {recentConfessions.map((confession: any, index: number) => (
                    <div key={confession.id}>
                      <InstagramConfessionCard 
                        confession={confession}
                        onUpdate={() => {
                          refetchRecent();
                          refetchFans();
                        }}
                      />
                      {index === 2 && <PeopleYouMayKnow />}
                    </div>
                  ))}
                </div>
                {isFetchingNextPage && (
                  <div className="space-y-0">
                    {[1, 2].map((i) => <PostSkeleton key={i} />)}
                  </div>
                )}
                <div ref={observerTarget} className="h-4" />
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default HomePage;
