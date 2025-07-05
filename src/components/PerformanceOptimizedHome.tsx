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

export default function PerformanceOptimizedHome() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('recent');
  const [showConfessionForm, setShowConfessionForm] = useState(false);

  // Optimized data fetching with intelligent caching
  const { 
    data: recentConfessions = [], 
    isLoading: isLoadingRecent,
    refetch: refetchRecent 
  } = useQuery({
    queryKey: ['optimized-confessions', 'recent', user?.id],
    queryFn: () => getOptimizedConfessions(undefined, user?.id, 30),
    staleTime: 60000, // 1 minute - less aggressive than before
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    refetchInterval: false, // We'll use real-time instead
  });

  const { 
    data: trendingConfessions = [], 
    refetch: refetchTrending,
    isLoading: isLoadingTrending 
  } = useQuery({
    queryKey: ['trending-confessions', user?.id],
    queryFn: () => getTrendingConfessions(30, user?.id),
    enabled: activeTab === 'trending',
    staleTime: 300000, // 5 minutes for trending
    refetchOnWindowFocus: false,
  });

  // Real-time updates for recent confessions
  const liveRecentConfessions = useRealTimeConfessions(recentConfessions);

  // Memoize current confessions to prevent unnecessary re-renders
  const currentConfessions = useMemo(() => {
    return activeTab === 'recent' ? liveRecentConfessions : trendingConfessions;
  }, [activeTab, liveRecentConfessions, trendingConfessions]);

  const isLoading = activeTab === 'recent' ? isLoadingRecent : isLoadingTrending;

  const handleConfessionSuccess = () => {
    // Only refetch if necessary - real-time will handle recent updates
    if (activeTab === 'trending') {
      refetchTrending();
    } else {
      refetchRecent(); // Fallback for reliability
    }
    setShowConfessionForm(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Only fetch trending data when tab is actually switched
    if (value === 'trending') {
      refetchTrending();
    }
  };

  const handleCreateStory = () => {
    window.dispatchEvent(new Event('create-story'));
  };

  // Performance monitoring
  useEffect(() => {
    const perfObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          console.log(`${entry.name}: ${entry.duration}ms`);
        }
      });
    });
    
    perfObserver.observe({ entryTypes: ['measure'] });
    
    return () => perfObserver.disconnect();
  }, []);

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* Sticky header with reduced re-renders */}
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

        {/* Following users bar */}
        {isAuthenticated && <FollowingUsersBar />}

        {/* Confession form with performance optimization */}
        {showConfessionForm && isAuthenticated && (
          <div className="mb-4 mx-4">
            <ConfessionForm onSuccess={handleConfessionSuccess} />
          </div>
        )}

        {/* Optimized confession list */}
        <div className="pb-20">
          {isLoading ? (
            // Simplified loading state
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
    </Layout>
  );
}