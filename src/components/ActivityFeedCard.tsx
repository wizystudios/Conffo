import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Users, Heart, TrendingUp } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'room_activity' | 'community_activity' | 'new_confession';
  title: string;
  description: string;
  timestamp: Date;
  roomId?: string;
  communityId?: string;
  icon: string;
}

export function ActivityFeedCard() {
  const navigate = useNavigate();

  // Fetch recent activity across rooms
  const { data: activities = [] } = useQuery({
    queryKey: ['home-activity'],
    queryFn: async () => {
      const activityItems: ActivityItem[] = [];

      // Get recent confessions across all rooms (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentConfessions } = await supabase
        .from('confessions')
        .select('room_id, created_at')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentConfessions) {
        // Group by room
        const roomCounts = recentConfessions.reduce((acc, c) => {
          acc[c.room_id] = (acc[c.room_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Find room with most activity
        const topRoomId = Object.entries(roomCounts)
          .sort((a, b) => b[1] - a[1])[0];

        if (topRoomId && topRoomId[1] > 0) {
          // Get room name
          const { data: room } = await supabase
            .from('rooms')
            .select('name')
            .eq('id', topRoomId[0])
            .maybeSingle();

          if (room) {
            activityItems.push({
              id: `room-${topRoomId[0]}`,
              type: 'room_activity',
              title: room.name,
              description: `${topRoomId[1]} new ${topRoomId[1] === 1 ? 'confession' : 'confessions'} today`,
              timestamp: new Date(),
              roomId: topRoomId[0],
              icon: '🔥'
            });
          }
        }
      }

      // Get recent community messages
      const { data: recentCommunityMessages } = await supabase
        .from('community_messages')
        .select('community_id, created_at')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentCommunityMessages && recentCommunityMessages.length > 0) {
        // Group by community
        const communityCounts = recentCommunityMessages.reduce((acc, m) => {
          acc[m.community_id] = (acc[m.community_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Find community with most activity
        const topCommunityId = Object.entries(communityCounts)
          .sort((a, b) => b[1] - a[1])[0];

        if (topCommunityId && topCommunityId[1] > 2) {
          const { data: community } = await supabase
            .from('communities')
            .select('id, name')
            .eq('id', topCommunityId[0])
            .maybeSingle();

          if (community) {
            activityItems.push({
              id: `community-${community.id}`,
              type: 'community_activity',
              title: community.name,
              description: `${topCommunityId[1]} new messages`,
              timestamp: new Date(),
              communityId: community.id,
              icon: '💬'
            });
          }
        }
      }

      return activityItems.slice(0, 3);
    },
    staleTime: 60000,
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  if (activities.length === 0) return null;

  return (
    <div className="px-4 mb-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {activities.map((activity) => (
          <button
            key={activity.id}
            onClick={() => {
              if (activity.roomId) {
                navigate(`/room/${activity.roomId}`);
              } else if (activity.communityId) {
                navigate('/chat');
              }
            }}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/15 rounded-full transition-colors"
          >
            <span className="text-sm">{activity.icon}</span>
            <div className="text-left">
              <p className="text-xs font-medium text-foreground leading-tight">{activity.title}</p>
              <p className="text-[10px] text-muted-foreground">{activity.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
