import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { RoomInfo } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ConffoRoomCardProps {
  room: RoomInfo;
  index: number;
}

// Room icons based on keywords
const getRoomIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('heart') || lower.includes('relationship') || lower.includes('love')) return '💔';
  if (lower.includes('secret') || lower.includes('ghost')) return '👻';
  if (lower.includes('fun') || lower.includes('funny') || lower.includes('laugh')) return '😂';
  if (lower.includes('talk') || lower.includes('chat') || lower.includes('real')) return '💬';
  if (lower.includes('mental') || lower.includes('health') || lower.includes('support')) return '🧠';
  if (lower.includes('adult') || lower.includes('18')) return '🔥';
  if (lower.includes('student') || lower.includes('school') || lower.includes('college')) return '🎓';
  if (lower.includes('work') || lower.includes('job') || lower.includes('office')) return '💼';
  if (lower.includes('random') || lower.includes('everything')) return '🎲';
  if (lower.includes('family')) return '🏠';
  if (lower.includes('friend')) return '🤝';
  return '💬';
};

export function ConffoRoomCard({ room, index }: ConffoRoomCardProps) {
  const navigate = useNavigate();

  // Fetch confession count and member count for this room
  const { data: roomStats } = useQuery({
    queryKey: ['room-stats', room.id],
    queryFn: async () => {
      // Get confession count
      const { count: confessionCount } = await supabase
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      // Count unique members (people who posted)
      const { data: allPosters } = await supabase
        .from('confessions')
        .select('user_id')
        .eq('room_id', room.id)
        .not('user_id', 'is', null);

      const uniqueMemberCount = new Set(allPosters?.map(c => c.user_id) || []).size;

      return {
        confessionCount: confessionCount || 0,
        memberCount: uniqueMemberCount,
      };
    },
    staleTime: 60000,
  });

  const icon = getRoomIcon(room.name);

  const handleClick = () => {
    navigate(`/room/${room.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 py-3 px-1 border-b border-border/30 hover:bg-muted/30 transition-colors text-left animate-fadeIn"
      style={{ 
        animationDelay: `${index * 30}ms`,
        animationFillMode: 'both'
      }}
    >
      {/* Emoji Icon */}
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
        <span className="text-lg">{icon}</span>
      </div>
      
      {/* Room Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm truncate">{room.name}</h3>
        <p className="text-xs text-muted-foreground truncate">
          {room.description || 'Anonymous confessions'}
        </p>
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="h-3 w-3" />
          <span className="text-xs">{roomStats?.memberCount || 0}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
