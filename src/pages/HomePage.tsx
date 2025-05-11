
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfessionCard } from '@/components/ConfessionCard';
import { EnhancedConfessionForm } from '@/components/EnhancedConfessionForm';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { getConfessions, getTrendingConfessions } from '@/services/supabaseDataService';
import { useQuery } from '@tanstack/react-query';

export default function HomePage() {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('recent');

  // Debug authentication status
  useEffect(() => {
    console.log("HomePage - Auth status:", {
      isAuthenticated,
      userId: user?.id,
      username: user?.username,
      isLoading
    });
  }, [isAuthenticated, user, isLoading]);

  // Using React Query for data fetching
  const { 
    data: recentConfessions = [],
    isLoading: isLoadingRecent,
    refetch: refetchRecent 
  } = useQuery({
    queryKey: ['confessions', 'recent', user?.id],
    queryFn: () => getConfessions(undefined, user?.id),
    enabled: true,
  });

  const {
    data: trendingConfessions = [],
    isLoading: isLoadingTrending,
    refetch: refetchTrending
  } = useQuery({
    queryKey: ['confessions', 'trending', user?.id],
    queryFn: () => getTrendingConfessions(5, user?.id),
    enabled: activeTab === 'trending',
  });

  const handleConfessionSuccess = () => {
    refetchRecent();
    if (activeTab === 'trending') {
      refetchTrending();
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'trending') {
      refetchTrending();
    }
  };
  
  const handleLoginClick = () => {
    window.location.href = '/auth';
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        {isAuthenticated ? (
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Share Your Confession</h2>
            <EnhancedConfessionForm onSuccess={handleConfessionSuccess} />
          </Card>
        ) : (
          <Card className="p-6 text-center border-dashed animate-pulse-soft">
            <h2 className="text-xl font-bold mb-2">Welcome to Confession Room</h2>
            <p className="text-muted-foreground mb-4">
              A safe space to share your thoughts anonymously.
            </p>
            <Button onClick={handleLoginClick}>Sign In or Register</Button>
          </Card>
        )}
        
        <Tabs defaultValue="recent" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>
          <TabsContent value="recent" className="mt-4 space-y-4">
            {isLoadingRecent ? (
              <p className="text-center py-8 text-muted-foreground">Loading confessions...</p>
            ) : recentConfessions.length > 0 ? (
              recentConfessions.map((confession) => (
                <ConfessionCard 
                  key={confession.id} 
                  confession={confession}
                  onUpdate={handleConfessionSuccess} 
                />
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No confessions yet. Be the first!</p>
            )}
          </TabsContent>
          <TabsContent value="trending" className="mt-4 space-y-4">
            {isLoadingTrending ? (
              <p className="text-center py-8 text-muted-foreground">Loading trending confessions...</p>
            ) : trendingConfessions.length > 0 ? (
              trendingConfessions.map((confession) => (
                <ConfessionCard 
                  key={confession.id} 
                  confession={confession}
                  onUpdate={handleConfessionSuccess} 
                />
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No trending confessions yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
