
import { Layout } from '@/components/Layout';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { useAuth } from '@/context/AuthContext';
import { getTrendingConfessions } from '@/services/supabaseDataService';
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
      <div className="max-w-lg mx-auto space-y-0">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-2">Trending Confessions</h1>
          <p className="text-muted-foreground">
            The most popular confessions from across all rooms
          </p>
        </div>
        
        <div className="space-y-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">
              Loading trending confessions...
            </p>
          ) : confessions.length > 0 ? (
            confessions.map((confession) => (
              <InstagramConfessionCard 
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
