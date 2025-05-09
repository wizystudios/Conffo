
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ConfessionCard } from '@/components/ConfessionCard';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { getTrendingConfessions } from '@/services/dataService';
import { Confession } from '@/types';

export default function TrendingPage() {
  const { user } = useAuth();
  const [trendingConfessions, setTrendingConfessions] = useState<Confession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadTrending = () => {
    setIsLoading(true);
    const trending = getTrendingConfessions(15); // Get top 15 trending
    setTrendingConfessions(trending);
    setIsLoading(false);
  };
  
  useEffect(() => {
    loadTrending();
  }, [user]);
  
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trending Confessions</h1>
          <p className="text-muted-foreground mb-6">
            The most popular confessions across all rooms.
          </p>
        </div>
        
        <Card className="p-6 border-l-4 border-l-primary">
          <h2 className="text-lg font-semibold mb-2">What Makes a Confession Trend?</h2>
          <p className="text-sm text-muted-foreground">
            Trending confessions are determined by the total number of reactions and comments they receive.
            React and comment to help confessions trend!
          </p>
        </Card>
        
        <div className="space-y-4 mt-6">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading trending confessions...</p>
          ) : trendingConfessions.length > 0 ? (
            trendingConfessions.map((confession) => (
              <ConfessionCard 
                key={confession.id} 
                confession={confession}
                onUpdate={loadTrending} 
              />
            ))
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No trending confessions yet. Start reacting to confessions!
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
