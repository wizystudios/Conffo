
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { FollowingUsersBar } from '@/components/FollowingUsersBar';
import { EnhancedConfessionForm } from '@/components/EnhancedConfessionForm';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { getConfessions, getTrendingConfessions } from '@/services/supabaseDataService';
import { useQuery } from '@tanstack/react-query';
import { Plus, TrendingUp, Clock, PlusCircle } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('recent');
  const [showConfessionForm, setShowConfessionForm] = useState(false);

  // Listen for create-confession event from navbar
  useEffect(() => {
    const handleCreateConfession = () => setShowConfessionForm(true);
    window.addEventListener('create-confession', handleCreateConfession);
    return () => window.removeEventListener('create-confession', handleCreateConfession);
  }, []);

  // Debug authentication status
  useEffect(() => {
    console.log("HomePage - Auth status:", {
      isAuthenticated,
      userId: user?.id,
      username: user?.username,
      isLoading
    });
  }, [isAuthenticated, user, isLoading]);

  // Using React Query for data fetching with performance optimizations
  const { 
    data: recentConfessions = [],
    isLoading: isLoadingRecent,
    refetch: refetchRecent 
  } = useQuery({
    queryKey: ['confessions', 'recent', user?.id],
    queryFn: () => getConfessions(undefined, user?.id),
    enabled: true,
    staleTime: 60000, // 1 minute cache
  });

  const {
    data: trendingConfessions = [],
    isLoading: isLoadingTrending,
    refetch: refetchTrending
  } = useQuery({
    queryKey: ['confessions', 'trending', user?.id],
    queryFn: () => getTrendingConfessions(5, user?.id),
    enabled: activeTab === 'trending',
    staleTime: 300000, // 5 minutes cache for trending
  });

  const handleConfessionSuccess = () => {
    // Refetch confessions without showing toast notifications
    refetchRecent();
    if (activeTab === 'trending') {
      refetchTrending();
    }
    setShowConfessionForm(false); // Hide the form after successful submission
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'trending') {
      refetchTrending();
    }
  };

  const handleCreateStory = () => {
    // Dispatch event for story creation
    window.dispatchEvent(new Event('create-story'));
  };
  
  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* Story-like navigation bar */}
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
        <FollowingUsersBar />

        {isAuthenticated && showConfessionForm && (
          <div className="mx-4 mb-6 p-4 bg-card rounded-2xl shadow-lg border animate-in fade-in slide-in-from-top-2">
            <h2 className="text-lg font-semibold mb-4">Share Your Confession</h2>
            <EnhancedConfessionForm 
              onSuccess={handleConfessionSuccess} 
              onCancel={() => setShowConfessionForm(false)}
            />
          </div>
        )}
        
        {/* Content based on active tab */}
        {activeTab === 'recent' ? (
          <>
            {isLoadingRecent ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading confessions...</p>
                </div>
              </div>
            ) : recentConfessions.length > 0 ? (
              <div className="space-y-0">
                {recentConfessions.map((confession) => (
                  <InstagramConfessionCard 
                    key={confession.id} 
                    confession={confession}
                    onUpdate={handleConfessionSuccess} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No confessions yet. Be the first!</p>
              </div>
            )}
          </>
        ) : (
          <>
            {isLoadingTrending ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading trending confessions...</p>
                </div>
              </div>
            ) : trendingConfessions.length > 0 ? (
              <div className="space-y-0">
                {trendingConfessions.map((confession) => (
                  <InstagramConfessionCard 
                    key={confession.id} 
                    confession={confession}
                    onUpdate={handleConfessionSuccess} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No trending confessions yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
