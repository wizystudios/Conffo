import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { EnhancedMultimediaForm } from '@/components/EnhancedMultimediaForm';
import { AllUsersBar } from '@/components/AllUsersBar';
import { PeopleYouMayKnow } from '@/components/PeopleYouMayKnow';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FollowingFeed } from '@/components/FollowingFeed';
import { offlineQueue } from '@/utils/offlineQueue';
import { RefreshCw, Search } from 'lucide-react';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState<'crew' | 'fans' | 'all'>('crew');
  const [showConfessionForm, setShowConfessionForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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

  const { data: recentConfessions = [], refetch: refetchRecent, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['confessions', 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: fansPosts = [], refetch: refetchFans, isLoading: isLoadingFans } = useQuery({
    queryKey: ['confessions', 'fans', user?.id],
    enabled: !!user,
    queryFn: async () => {
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
        .limit(20);
      
      if (error) throw error;
      return data || [];
    }
  });

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await offlineQueue.uploadQueue();
    await refetchRecent();
    await refetchFans();
    setIsRefreshing(false);
  };

  const handleConfessionSuccess = () => {
    refetchRecent();
    refetchFans();
    setShowConfessionForm(false);
  };

  const handleTabChange = (tab: 'crew' | 'fans' | 'all') => {
    setActiveTab(tab);
  };

  const currentConfessions = activeTab === 'all' ? recentConfessions : activeTab === 'fans' ? fansPosts : [];
  const isLoadingConfessions = activeTab === 'all' ? isLoadingRecent : activeTab === 'fans' ? isLoadingFans : false;

  return (
    <Layout>
      {isAuthenticated && (
        <div className="px-2 sm:px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/search')}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-muted/50 hover:bg-muted h-7"
          >
            <Search className="h-3 w-3" />
            <span className="text-xs text-muted-foreground">Search</span>
          </Button>
        </div>
      )}

      <div className="sticky top-[56px] z-20 bg-background/95 backdrop-blur-sm border-b px-2 py-1.5">
        <div className="flex items-center gap-1 mb-1">
          <Button
            variant={activeTab === 'crew' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('crew')}
            className="flex-1 h-7 text-xs rounded-full"
          >
            My Crew
          </Button>
          <Button
            variant={activeTab === 'fans' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('fans')}
            className="flex-1 h-7 text-xs rounded-full"
          >
            My Fans
          </Button>
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('all')}
            className="flex-1 h-7 text-xs rounded-full"
          >
            All Posts
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePullToRefresh}
          disabled={isRefreshing}
          className="w-full h-6 text-xs"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Refresh & Sync'}
        </Button>
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
          <div className="flex justify-center items-center py-8">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : fansPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No posts from your fans yet!
          </div>
        ) : (
          <div className="space-y-0">
            {fansPosts.map((confession: any, index: number) => (
              <div key={confession.id}>
                <InstagramConfessionCard confession={confession} />
                {index === 2 && <PeopleYouMayKnow />}
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {isLoadingConfessions ? (
            <div className="flex justify-center items-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : currentConfessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No confessions yet. Be the first to share!
            </div>
          ) : (
            <div className="space-y-0">
              {currentConfessions.map((confession: any, index: number) => (
                <div key={confession.id}>
                  <InstagramConfessionCard confession={confession} />
                  {index === 2 && <PeopleYouMayKnow />}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default HomePage;
