
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { AllUsersBar } from '@/components/AllUsersBar';
import { EnhancedMultimediaForm } from '@/components/EnhancedMultimediaForm';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { getConfessions, getTrendingConfessions } from '@/services/supabaseDataService';
import { useQuery } from '@tanstack/react-query';
import { Plus, TrendingUp, Clock, PlusCircle } from 'lucide-react';
import { PeopleYouMayKnow } from '@/components/PeopleYouMayKnow';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScrollNavbar } from '@/hooks/useScrollNavbar';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('recent');
  const [showConfessionForm, setShowConfessionForm] = useState(false);
  const isNavbarVisible = useScrollNavbar();
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

  const { 
    data: recentConfessions = [],
    refetch: refetchRecent,
    isLoading: isLoadingRecent
  } = useQuery({
    queryKey: ['confessions', 'recent', user?.id],
    queryFn: () => getConfessions(undefined, user?.id),
    enabled: true,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const {
    data: trendingConfessions = [],
    refetch: refetchTrending,
    isLoading: isLoadingTrending
  } = useQuery({
    queryKey: ['confessions', 'trending', user?.id],
    queryFn: () => getTrendingConfessions(5, user?.id),
    enabled: activeTab === 'trending',
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
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
  
  const currentConfessions = activeTab === 'recent' ? recentConfessions : trendingConfessions;
  const isLoadingConfessions = activeTab === 'recent' ? isLoadingRecent : isLoadingTrending;
  
  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* Search Icon for logged in users */}
        {isAuthenticated && (
          <div className="px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/search')}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-muted/50 hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              <span className="text-muted-foreground">Search</span>
            </Button>
          </div>
        )}
        
        <div className={`sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border mb-0 transition-transform duration-300 ${isNavbarVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-2 flex-1">
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
            
          </div>
        </div>

        <AllUsersBar />

        {isAuthenticated && showConfessionForm && (
          <div className="mx-4 mb-6 p-4 bg-card rounded-2xl shadow-lg border animate-in fade-in slide-in-from-top-2">
            <h2 className="text-lg font-semibold mb-4">Share Your Confession</h2>
            <EnhancedMultimediaForm 
              onSuccess={handleConfessionSuccess} 
              onCancel={() => setShowConfessionForm(false)}
            />
          </div>
        )}
        
        {isLoadingConfessions ? (
          <div className="space-y-4 p-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {currentConfessions.length > 0 ? (
              <div className="space-y-0">
                {currentConfessions.map((confession, index) => (
                  <div key={confession.id}>
                    <InstagramConfessionCard 
                      confession={confession}
                      onUpdate={handleConfessionSuccess} 
                    />
                    {(index + 1) % 2 === 0 && (
                      <div className="py-4">
                        <PeopleYouMayKnow />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {activeTab === 'recent' 
                    ? 'No confessions yet. Be the first!' 
                    : 'No trending confessions yet.'
                  }
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
