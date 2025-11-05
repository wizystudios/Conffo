
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
import { Plus, Users } from 'lucide-react';
import { PeopleYouMayKnow } from '@/components/PeopleYouMayKnow';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScrollNavbar } from '@/hooks/useScrollNavbar';
import { FollowingFeed } from '@/components/FollowingFeed';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('fans');
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
    enabled: activeTab === 'recent',
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const handleConfessionSuccess = () => {
    refetchRecent();
    setShowConfessionForm(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleCreateStory = () => {
    window.dispatchEvent(new Event('create-story'));
  };
  
  const currentConfessions = activeTab === 'recent' ? recentConfessions : [];
  const isLoadingConfessions = activeTab === 'recent' ? isLoadingRecent : false;
  
  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* Search Icon for logged in users */}
        {isAuthenticated && (
          <div className="px-2 py-2 bg-background/95 backdrop-blur-sm border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/search')}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-muted/50 hover:bg-muted h-8"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs text-muted-foreground">Search</span>
            </Button>
          </div>
        )}
        
        <div className={`sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border mb-0 transition-transform duration-300 ${isNavbarVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex items-center justify-center px-2 py-2 gap-1">
            <Button
              variant={activeTab === 'fans' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('fans')}
              className="flex items-center gap-1.5 rounded-full text-xs h-8 px-3"
            >
              <Users className="h-3.5 w-3.5" />
              My Crew
            </Button>
            <Button
              variant={activeTab === 'recent' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('recent')}
              className="flex items-center gap-1.5 rounded-full text-xs h-8 px-3"
            >
              All Posts
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
        
        {activeTab === 'fans' ? (
          <FollowingFeed />
        ) : isLoadingConfessions ? (
          <div className="space-y-2 p-2">
            {[1, 2].map((i) => (
              <Card key={i} className="p-3 animate-pulse">
                <div className="h-3 bg-muted rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
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
                    {(index + 1) % 3 === 0 && (
                      <div className="py-2">
                        <PeopleYouMayKnow />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No confessions yet. Be the first!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
