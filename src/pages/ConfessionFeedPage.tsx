import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
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

const PAGE_SIZE = 20;

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
  const [scrolled, setScrolled] = useState(false);

  // Discover pagination state
  const [discoverPosts, setDiscoverPosts] = useState<Confession[]>([]);
  const [discoverPage, setDiscoverPage] = useState(0);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);
  const [discoverLoadingMore, setDiscoverLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isDiscover = source === 'discover';

  const { data: scopedConfessions = [], isLoading: scopedLoading, refetch } = useQuery({
    queryKey: ['feed', source, sourceId, user?.id],
    queryFn: async (): Promise<Confession[]> => {
      if (source === 'room' && sourceId) {
        return await getConfessions(sourceId as Room, user?.id);
      }
      if (source === 'user' && sourceId) {
        return await getUserConfessions(sourceId);
      }
      return [];
    },
    enabled: !isDiscover,
  });

  const loadDiscoverPage = useCallback(async (page: number) => {
    setDiscoverLoadingMore(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from('confessions')
      .select('id, content, room_id, created_at, user_id, media_url, media_type')
      .order('created_at', { ascending: false })
      .range(from, to);
    const mapped: Confession[] = (data || []).map((p: any) => ({
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
    setDiscoverPosts(prev => (page === 0 ? mapped : [...prev, ...mapped]));
    setDiscoverHasMore(mapped.length === PAGE_SIZE);
    setDiscoverLoadingMore(false);
  }, []);

  // Initial discover load
  useEffect(() => {
    if (!isDiscover) return;
    setDiscoverPosts([]);
    setDiscoverPage(0);
    setDiscoverHasMore(true);
    loadDiscoverPage(0);
  }, [isDiscover, loadDiscoverPage]);

  // Infinite scroll for discover
  useEffect(() => {
    if (!isDiscover || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && discoverHasMore && !discoverLoadingMore) {
          const next = discoverPage + 1;
          setDiscoverPage(next);
          loadDiscoverPage(next);
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isDiscover, discoverPage, discoverHasMore, discoverLoadingMore, loadDiscoverPage]);

  const confessions = isDiscover ? discoverPosts : scopedConfessions;
  const isLoading = isDiscover ? (discoverPosts.length === 0 && discoverLoadingMore) : scopedLoading;

  // Scroll to the tapped confession once content is laid out
  useEffect(() => {
    if (scrolled || isLoading || !startId || confessions.length === 0) return;
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

  const handleUpdate = () => {
    if (isDiscover) loadDiscoverPage(0);
    else refetch();
  };

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
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Compass className="h-12 w-12" />
            </div>
            <h3 className="font-semibold text-base mb-1">No confessions to show</h3>
            <p className="text-muted-foreground text-[13px]">Be the first to share something.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {confessions.map((c) => (
              <div key={c.id} id={`feed-item-${c.id}`}>
                <InstagramConfessionCard confession={c} onUpdate={handleUpdate} />
              </div>
            ))}
            {isDiscover && (
              <div ref={sentinelRef} className="py-6 flex justify-center">
                {discoverLoadingMore ? (
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : !discoverHasMore ? (
                  <p className="text-xs text-muted-foreground">You're all caught up</p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
