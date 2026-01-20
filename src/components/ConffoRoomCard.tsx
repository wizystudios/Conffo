import { Link } from 'react-router-dom';
import { Users, ChevronRight, Lock } from 'lucide-react';
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
  if (lower.includes('mental') || lower.includes('health') || lower.includes('support')) return '🧠';
  if (lower.includes('adult') || lower.includes('18')) return '🔥';
  if (lower.includes('student') || lower.includes('school') || lower.includes('college')) return '🎓';
  if (lower.includes('work') || lower.includes('job') || lower.includes('office')) return '💼';
  if (lower.includes('random') || lower.includes('everything')) return '🎲';
  if (lower.includes('secret')) return '👻';
  if (lower.includes('fun') || lower.includes('funny')) return '😂';
  if (lower.includes('family')) return '🏠';
  if (lower.includes('friend')) return '🤝';
  return '💬';
};

// Check if room is locked
const isLockedRoom = (name: string): boolean => {
  const lower = name.toLowerCase();
  return lower.includes('adult') || lower.includes('18+') || lower.includes('locked');
};

export function ConffoRoomCard({ room, index }: ConffoRoomCardProps) {
  // Fetch confession count for today
  const { data: confessionCount = 0 } = useQuery({
    queryKey: ['room-confession-count', room.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .gte('created_at', today.toISOString());
      
      return count || 0;
    },
    staleTime: 60000,
  });

  const icon = getRoomIcon(room.name);
  const isLocked = isLockedRoom(room.name);

  return (
    <Link to={`/room/${room.id}`}>
      <div 
        className="conffo-glass-card p-4 flex items-center gap-4 group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-in fade-in slide-in-from-bottom-3"
        style={{ 
          animationDelay: `${index * 80}ms`,
          animationFillMode: 'backwards'
        }}
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
          <span className="text-2xl">{icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base mb-0.5 truncate">{room.name}</h3>
          <p className="text-xs text-muted-foreground truncate mb-1.5">
            {room.description || 'Anonymous confessions'}
          </p>
          <div className="flex items-center gap-1.5">
            {isLocked && (
              <>
                <Lock className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-500 mr-2">Locked · Join to view</span>
              </>
            )}
            <Users className="h-3 w-3 text-primary/70" />
            <span className="text-xs text-muted-foreground">
              {confessionCount} confessions today
            </span>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
    </Link>
  );
}
