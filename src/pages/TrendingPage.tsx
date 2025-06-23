
import { Layout } from '@/components/Layout';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { useAuth } from '@/context/AuthContext';
import { getTrendingConfessions } from '@/services/supabaseDataService';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';

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
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border mb-4">
          <div className="flex items-center justify-center px-4 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Trending Confessions</h1>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading trending confessions...</p>
            </div>
          </div>
        ) : confessions.length > 0 ? (
          <div className="space-y-0">
            {confessions.map((confession) => (
              <InstagramConfessionCard 
                key={confession.id}
                confession={confession}
                onUpdate={handleConfessionUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mx-4">
            <div className="border-2 border-dashed border-muted rounded-2xl p-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No trending confessions yet.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
