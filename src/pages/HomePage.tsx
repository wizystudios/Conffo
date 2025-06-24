
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

  const { 
    data: recentConfessions = [],
    refetch: refetchRecent 
  } = useQuery({
    queryKey: ['confessions', 'recent', user?.id],
    queryFn: () => getConfessions(undefined, user?.id),
    enabled: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  const {
    data: trendingConfessions = [],
    refetch: refetchTrending
  } = useQuery({
    queryKey: ['confessions', 'trending', user?.id],
    queryFn: () => getTrendingConfessions(5, user?.id),
    enabled: activeTab === 'trending',
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  const handleConfessionSuccess = () => {
    refetchRecent();
    if (activeTab === 'trending') {
      refetchTrending();
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
  
  return (
    <Layout>
      <div className="max-w-lg mx-auto">
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
        
        {activeTab === 'recent' ? (
          <>
            {recentConfessions.length > 0 ? (
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
            {trendingConfessions.length > 0 ? (
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
