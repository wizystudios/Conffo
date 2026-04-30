import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { useQuery } from '@tanstack/react-query';
import {
  getConfessions,
  getUserConfessions,
} from '@/services/supabaseDataService';
import { supabase } from '@/integrations/supabase/client';
import { Confession, Room } from '@/types';
import { useAuth } from '@/context/AuthContext';

/**
 * Instagram-style continuous vertical feed.
 * Routes:
 *   /feed/room/:roomId?start=:confessionId
 *   /feed/user/:userId?start=:confessionId
 *   /feed/discover?start=:confessionId
 */
export default function ConfessionFeedPage() {
  const { source, sourceId } = useParams<{ source: string; sourceId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const startId = new URLSearchParams(location.search).get('start');
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const { data: confessions = [], isLoading, refetch } = useQuery({
    queryKey: ['feed', source, sourceId, user?.id],
    queryFn: async (): Promise<Confession[]> => {
      if (source === 'room' && sourceId) {
        return await getConfessions(sourceId as Room, user?.id);
      }
      if (source === 'user' && sourceId) {
        return await getUserConfessions(sourceId);
      }
      // discover: latest
      const { data } = await supabase
        .from('confessions')
        .select('id, content, room_id, created_at, user_id, media_url, media_type')
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []).map((p: any) => ({
        id: p.id,
        content: p.content,
        room: p.room_id as Room,
        userId: p.user_id || '',
        timestamp: new Date(p.created_at).getTime(),
        reactions: { like: 0, laugh: 0, shock: 0, heart: 0 },
        commentCount: 0,
        mediaUrl: p.media_url,
        mediaType: p.media_type,
      }));
    },
  });

  // Scroll to the tapped confession once content is laid out
  useEffect(() => {
    if (scrolled || isLoading || !startId || confessions.length === 0) return;
    // Wait two frames so cards mount and lay out first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`feed-item-${startId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
          setScrolled(true);
        }
      });
    });
  }, [confessions, isLoading, startId, scrolled]);

  return (
    <Layout showNavBar={false}>
      <div className="max-w-lg mx-auto pb-20">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border/40">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="h-9 w-9 -ml-1 flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold">Confessions</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : confessions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No confessions to show.
          </div>
        ) : (
          <div ref={containerRef} className="divide-y divide-border/40">
            {confessions.map((c) => (
              <div key={c.id} id={`feed-item-${c.id}`}>
                <InstagramConfessionCard confession={c} onUpdate={refetch} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
