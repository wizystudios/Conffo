import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showNotification } from '@/utils/pushNotifications';

// Threshold: a followed room "trends" when it accumulates
// at least this many reactions in the lookback window.
const TREND_THRESHOLD = 5;
const LOOKBACK_MINUTES = 60;
const POLL_MS = 5 * 60 * 1000; // 5 minutes
const NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours per room

function lastNotifiedKey(userId: string, roomId: string) {
  return `trend-notified:${userId}:${roomId}`;
}

export function useTrendingRoomNotifications() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;

    const check = async () => {
      try {
        const { data: follows } = await supabase
          .from('room_follows')
          .select('room_id')
          .eq('user_id', user.id);
        if (!follows?.length || cancelled) return;

        const since = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000).toISOString();
        for (const { room_id } of follows) {
          const cooldownKey = lastNotifiedKey(user.id, room_id);
          const last = Number(localStorage.getItem(cooldownKey) || '0');
          if (Date.now() - last < NOTIFY_COOLDOWN_MS) continue;

          const { data: confs } = await supabase
            .from('confessions')
            .select('id')
            .eq('room', room_id)
            .gte('created_at', since);
          if (!confs?.length) continue;

          const ids = confs.map((c) => c.id);
          const { count } = await supabase
            .from('reactions')
            .select('id', { count: 'exact', head: true })
            .in('confession_id', ids);

          if ((count ?? 0) >= TREND_THRESHOLD) {
            showNotification(`🔥 ${room_id} is trending`, {
              body: 'New confessions are gaining traction in a room you follow.',
              tag: `trending-${room_id}`,
              onClick: () => { window.location.href = `/room/${room_id}`; },
            });
            localStorage.setItem(cooldownKey, String(Date.now()));
          }
        }
      } catch (err) {
        // Silent — non-critical background task.
        console.debug('trending notifications check failed', err);
      }
    };

    check();
    const id = window.setInterval(check, POLL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [isAuthenticated, user?.id]);
}
