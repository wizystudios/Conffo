import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { useAuth } from '@/context/AuthContext';
import { getConfessions } from '@/services/supabaseDataService';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function RecentPage() {
  const { user } = useAuth();

  const { 
    data: recentConfessions = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['confessions', 'recent', user?.id],
    queryFn: () => getConfessions(undefined, user?.id),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const handleUpdate = () => {
    refetch();
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm border-b border-border mb-4">
          <div className="flex items-center justify-center px-4 py-3">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Posts
            </h1>
          </div>
        </div>

        {isLoading ? (
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
            {recentConfessions.length > 0 ? (
              <div className="space-y-0">
                {recentConfessions.map((confession) => (
                  <InstagramConfessionCard 
                    key={confession.id}
                    confession={confession}
                    onUpdate={handleUpdate} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No recent posts found</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}