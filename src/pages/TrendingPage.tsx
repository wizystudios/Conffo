
import { Layout } from '@/components/Layout';
import { ConfessionCard } from '@/components/ConfessionCard';
import { useAuth } from '@/context/AuthContext';
import { getTrendingConfessions } from '@/services/supabaseDataService';
import { Confession } from '@/types';
import { useQuery } from '@tanstack/react-query';

export default function TrendingPage() {
  const { user } = useAuth();
  
  const { data: confessions = [], isLoading, refetch } = useQuery({
    queryKey: ['confessions', 'trending', user?.id],
    queryFn: () => getTrendingConfessions(15, user?.id),
  });
  
  const handleConfessionUpdate = () => {
    refetch();
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Trending Confessions</h1>
          <p className="text-muted-foreground">
            The most popular confessions from across all rooms
          </p>
        </div>
        
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">
              Loading trending confessions...
            </p>
          ) : confessions.length > 0 ? (
            confessions.map((confession) => (
              <ConfessionCard 
                key={confession.id}
                confession={confession}
                onUpdate={handleConfessionUpdate}
              />
            ))
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No trending confessions yet.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
