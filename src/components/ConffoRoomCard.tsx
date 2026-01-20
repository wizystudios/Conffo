import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, Lock } from 'lucide-react';
import { RoomInfo } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ConffoRoomCardProps {
  room: RoomInfo;
  index: number;
}

// Color themes for different rooms - matching the design reference
const ROOM_THEMES = [
  { bg: 'from-rose-400/80 to-rose-600/80', border: 'border-rose-300/30' },
  { bg: 'from-violet-400/80 to-purple-600/80', border: 'border-violet-300/30' },
  { bg: 'from-amber-400/80 to-orange-500/80', border: 'border-amber-300/30' },
  { bg: 'from-emerald-400/80 to-teal-600/80', border: 'border-emerald-300/30' },
  { bg: 'from-blue-400/80 to-indigo-600/80', border: 'border-blue-300/30' },
  { bg: 'from-pink-400/80 to-fuchsia-600/80', border: 'border-pink-300/30' },
];

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
  const theme = ROOM_THEMES[index % ROOM_THEMES.length];

  // Fetch confession count for this room
  const { data: confessionCount = 0 } = useQuery({
    queryKey: ['room-confession-count', room.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);
      
      return count || 0;
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
      className={`relative aspect-[4/5] rounded-2xl overflow-hidden border ${theme.border} transition-all hover:scale-[1.02] active:scale-[0.98] text-left w-full`}
      style={{ 
        animationDelay: `${index * 100}ms`,
        animation: 'fadeIn 0.4s ease-out forwards',
        opacity: 0
      }}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`} />
      
      {/* Subtle cosmic overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col p-4">
        {/* Emoji Icon */}
        <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-auto">
          <span className="text-3xl">{icon}</span>
        </div>
        
        {/* Room Name */}
        <h3 className="text-white font-bold text-lg leading-tight mb-1">
          {room.name}
        </h3>
        
        {/* Description */}
        <p className="text-white/70 text-xs line-clamp-2 mb-3">
          {room.description || 'Anonymous confessions'}
        </p>
        
        {/* Confession count */}
        <div className="flex items-center gap-1.5 text-white/80">
          <Users className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{confessionCount}</span>
          <span className="text-[10px] text-white/60">confessions</span>
        </div>
      </div>
    </button>
  );
}
