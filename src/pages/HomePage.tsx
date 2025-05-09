
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfessionCard } from '@/components/ConfessionCard';
import { ConfessionForm } from '@/components/ConfessionForm';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { getConfessions, getTrendingConfessions } from '@/services/dataService';
import { Confession } from '@/types';

export default function HomePage() {
  const { user, login } = useAuth();
  const [recentConfessions, setRecentConfessions] = useState<Confession[]>([]);
  const [trendingConfessions, setTrendingConfessions] = useState<Confession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadConfessions = () => {
    setIsLoading(true);
    
    const recent = getConfessions(undefined, user?.id);
    setRecentConfessions(recent);
    
    const trending = getTrendingConfessions();
    setTrendingConfessions(trending);
    
    setIsLoading(false);
  };
  
  useEffect(() => {
    loadConfessions();
  }, [user]);
  
  return (
    <Layout>
      <div className="space-y-6">
        {user ? (
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Share Your Confession</h2>
            <ConfessionForm onSuccess={loadConfessions} />
          </Card>
        ) : (
          <Card className="p-6 text-center border-dashed animate-pulse-soft">
            <h2 className="text-xl font-bold mb-2">Welcome to Confession Room</h2>
            <p className="text-muted-foreground mb-4">
              A safe space to share your thoughts anonymously.
            </p>
            <Button onClick={login}>Enter Anonymously</Button>
          </Card>
        )}
        
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>
          <TabsContent value="recent" className="mt-4 space-y-4">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading confessions...</p>
            ) : recentConfessions.length > 0 ? (
              recentConfessions.map((confession) => (
                <ConfessionCard 
                  key={confession.id} 
                  confession={confession}
                  onUpdate={loadConfessions} 
                />
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No confessions yet. Be the first!</p>
            )}
          </TabsContent>
          <TabsContent value="trending" className="mt-4 space-y-4">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading trending confessions...</p>
            ) : trendingConfessions.length > 0 ? (
              trendingConfessions.map((confession) => (
                <ConfessionCard 
                  key={confession.id} 
                  confession={confession}
                  onUpdate={loadConfessions} 
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
