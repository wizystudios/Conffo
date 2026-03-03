import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, TrendingUp, Plus, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { FollowingUsersBar } from '@/components/FollowingUsersBar';
import { useAuth } from '@/context/AuthContext';
import { ConfessionForm } from '@/components/ConfessionForm';
import { getOptimizedConfessions } from '@/services/optimizedDataService';
import { useRealTimeConfessions } from '@/hooks/useRealTimeConfessions';
import { getTrendingConfessions } from '@/services/supabaseDataService';
import { ImmersivePostViewer } from '@/components/ImmersivePostViewer';
import { Confession } from '@/types';

export default function PerformanceOptimizedHome() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('recent');
  const [showConfessionForm, setShowConfessionForm] = useState(false);
  const [immersiveUser, setImmersiveUser] = useState<{ id: string; username: string; avatar: string } | null>(null);

  const { 
    data: recentConfessions = [], 
    isLoading: isLoadingRecent,
    refetch: refetchRecent 
  } = useQuery({
    queryKey: ['optimized-confessions', 'recent', user?.id],
    queryFn: () => getOptimizedConfessions(undefined, user?.id, 30),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { 
    data: trendingConfessions = [], 
    refetch: refetchTrending,
    isLoading: isLoadingTrending 
  } = useQuery({
    queryKey: ['trending-confessions', user?.id],
    queryFn: () => getTrendingConfessions(30, user?.id),
    enabled: activeTab === 'trending',
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const liveRecentConfessions = useRealTimeConfessions(recentConfessions);

  const currentConfessions = useMemo(() => {
    return activeTab === 'recent' ? liveRecentConfessions : trendingConfessions;
  }, [activeTab, liveRecentConfessions, trendingConfessions]);

  const isLoading = activeTab === 'recent' ? isLoadingRecent : isLoadingTrending;

  // Get posts for a specific user (for immersive viewer)
  const userPosts = useMemo(() => {
    if (!immersiveUser) return [];
    return currentConfessions.filter(c => c.userId === immersiveUser.id);
  }, [immersiveUser, currentConfessions]);

  const handleConfessionSuccess = () => {
    if (activeTab === 'trending') {
      refetchTrending();
    } else {
      refetchRecent();
    }
    setShowConfessionForm(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'trending') {
      refetchTrending();
    }
  };

  const handleCreateStory = () => {
    window.dispatchEvent(new Event('create-story'));
  };

  // Handle circle tap → open immersive viewer for that user
  const handleUserCircleTap = (userId: string, username: string, avatar: string) => {
    const posts = currentConfessions.filter(c => c.userId === userId);
    if (posts.length > 0) {
      setImmersiveUser({ id: userId, username, avatar });
    }
  };

  // Handle tap on a post → open immersive viewer starting at that post
  const [immersiveStartIndex, setImmersiveStartIndex] = useState(0);
  const [showAllImmersive, setShowAllImmersive] = useState(false);

  const handlePostTap = (confessionId: string) => {
    const index = currentConfessions.findIndex(c => c.id === confessionId);
    if (index >= 0) {
      setImmersiveStartIndex(index);
      setShowAllImmersive(true);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border mb-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              <Button
                variant={activeTab === 'recent' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('recent')}
                className="flex items-center gap-2 rounded-full"
              >
                <Clock className="h-4 w-4" />
                Recent
              </Button>
              <Button
                variant={activeTab === 'trending' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('trending')}
                className="flex items-center gap-2 rounded-full"
              >
                <TrendingUp className="h-4 w-4" />
                Trending
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              {isAuthenticated && (
                <>
                  <Button 
                    onClick={handleCreateStory} 
                    size="sm" 
                    variant="outline"
                    className="rounded-full shadow-md hover:shadow-lg transition-all"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => setShowConfessionForm(!showConfessionForm)} 
                    size="sm" 
                    className="rounded-full shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Following users bar - tapping opens immersive viewer */}
        {isAuthenticated && (
          <FollowingUsersBar onUserTap={handleUserCircleTap} />
        )}

        {/* Confession form */}
        {showConfessionForm && isAuthenticated && (
          <div className="mb-4 mx-4">
            <ConfessionForm onSuccess={handleConfessionSuccess} />
          </div>
        )}

        {/* Confession list */}
        <div className="pb-20">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : currentConfessions.length === 0 ? (
            <div className="text-center py-12 mx-4">
              <p className="text-muted-foreground mb-4">
                {activeTab === 'recent' ? 'No recent confessions' : 'No trending confessions'}
              </p>
              {isAuthenticated && (
                <Button onClick={() => setShowConfessionForm(true)}>
                  Share Your First Confession
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {currentConfessions.map((confession) => (
                <div key={confession.id} className="optimized-fade-in">
                  <InstagramConfessionCard 
                    confession={confession} 
                    onUpdate={refetchRecent}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Immersive viewer for user circle tap */}
      {immersiveUser && userPosts.length > 0 && (
        <ImmersivePostViewer
          confessions={userPosts}
          onClose={() => setImmersiveUser(null)}
          onUpdate={refetchRecent}
          userName={immersiveUser.username}
          userAvatar={immersiveUser.avatar}
        />
      )}

      {/* Immersive viewer for all posts */}
      {showAllImmersive && (
        <ImmersivePostViewer
          confessions={currentConfessions}
          startIndex={immersiveStartIndex}
          onClose={() => setShowAllImmersive(false)}
          onUpdate={refetchRecent}
        />
      )}
    </Layout>
  );
}
