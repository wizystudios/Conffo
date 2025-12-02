import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { EnhancedMultimediaForm } from '@/components/EnhancedMultimediaForm';
import { AllUsersBar } from '@/components/AllUsersBar';
import { PeopleYouMayKnow } from '@/components/PeopleYouMayKnow';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FollowingFeed } from '@/components/FollowingFeed';
import { offlineQueue } from '@/utils/offlineQueue';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { RefreshCw, Search } from 'lucide-react';
import { PostSkeleton } from '@/components/PostSkeleton';
import { haptic } from '@/utils/hapticFeedback';
import { Confession } from '@/types';

// Transform raw DB data to Confession type
const transformConfession = (raw: any): Confession => ({
  id: raw.id,
  content: raw.content,
  room: raw.room_id,
  userId: raw.user_id,
  timestamp: new Date(raw.created_at).getTime(),
  reactions: { like: 0, laugh: 0, shock: 0, heart: 0 },
  userReactions: [],
  commentCount: 0,
  mediaUrl: raw.media_url,
  mediaType: raw.media_type as 'image' | 'video' | 'audio' | undefined,
  tags: raw.tags || []
});

const HomePage = () => {
  const [activeTab, setActiveTab] = useState<'crew' | 'fans' | 'all'>('all');
  const [showConfessionForm, setShowConfessionForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const observerTarget = useRef(null);

  useEffect(() => {
    const handleCreateConfession = () => setShowConfessionForm(true);
    const handleCreateStory = () => setShowConfessionForm(true);
    
    window.addEventListener('create-confession', handleCreateConfession);
    window.addEventListener('create-story', handleCreateStory);
    
    return () => {
      window.removeEventListener('create-confession', handleCreateConfession);
      window.removeEventListener('create-story', handleCreateStory);
    };
  }, []);

  // All Posts query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch: refetchRecent, isLoading: isLoadingRecent } = useInfiniteQuery({
    queryKey: ['confessions', 'recent'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
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

  const recentConfessions = data?.pages.flatMap(page => page) || [];

  // Fans Posts query (posts from people who follow current user)
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

  const fansPosts = fansData?.pages.flatMap(page => page) || [];

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

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      if (activeTab === 'fans') setActiveTab('all');
      else if (activeTab === 'all') setActiveTab('crew');
    }
    
    if (isRightSwipe) {
      if (activeTab === 'crew') setActiveTab('all');
      else if (activeTab === 'all') setActiveTab('fans');
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const handlePullToRefresh = async () => {
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

  const handleTabChange = (tab: 'crew' | 'fans' | 'all') => {
    haptic.light();
    setActiveTab(tab);
  };

  const isLoadingConfessions = activeTab === 'all' ? isLoadingRecent : activeTab === 'fans' ? isLoadingFans : false;

  return (
    <Layout>
      <OfflineIndicator />
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sticky top-[44px] z-20 bg-background/95 backdrop-blur-sm border-b px-2 py-1.5">
          <div className="flex items-center justify-between gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePullToRefresh}
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
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/search')}
              className="h-7 w-7"
            >
              <Search className="h-4 w-4" />
            </Button>
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
