import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { RoomInfo } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ConffoRoomCardProps {
  room: RoomInfo;
  index: number;
}

// Color themes for different rooms - matching the design reference
const ROOM_THEMES = [
  { bg: 'from-rose-400/90 to-rose-600/90', border: 'border-rose-300/30' },
  { bg: 'from-violet-400/90 to-purple-600/90', border: 'border-violet-300/30' },
  { bg: 'from-amber-400/90 to-orange-500/90', border: 'border-amber-300/30' },
  { bg: 'from-emerald-400/90 to-teal-600/90', border: 'border-emerald-300/30' },
  { bg: 'from-blue-400/90 to-indigo-600/90', border: 'border-blue-300/30' },
  { bg: 'from-pink-400/90 to-fuchsia-600/90', border: 'border-pink-300/30' },
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

  // Fetch confession count and recent users for this room
  const { data: roomStats } = useQuery({
    queryKey: ['room-stats', room.id],
    queryFn: async () => {
      // Get confession count
      const { count: confessionCount } = await supabase
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      // Get recent unique users who posted in this room (last 10 confessions)
      const { data: recentConfessions } = await supabase
        .from('confessions')
        .select('user_id')
        .eq('room_id', room.id)
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get unique user IDs
      const uniqueUserIds = [...new Set(recentConfessions?.map(c => c.user_id).filter(Boolean) || [])].slice(0, 4);

      // Fetch profiles for these users
      let memberProfiles: Array<{ id: string; avatar_url: string | null; username: string | null }> = [];
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url, username')
          .in('id', uniqueUserIds);
        memberProfiles = profiles || [];
      }

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
        memberProfiles
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
      className={`relative aspect-[5/3] rounded-lg overflow-hidden border ${theme.border} transition-all hover:scale-[1.02] active:scale-[0.98] text-left w-full animate-fadeIn`}
      style={{ 
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'both'
      }}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`} />
      
      {/* Subtle cosmic overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col p-3">
        {/* Emoji Icon */}
        <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-auto">
          <span className="text-lg">{icon}</span>
        </div>
        
        {/* Room Name */}
        <h3 className="text-white font-bold text-sm leading-tight mb-0.5">
          {room.name}
        </h3>
        
        {/* Description */}
        <p className="text-white/70 text-[10px] line-clamp-1 mb-1.5">
          {room.description || 'Anonymous confessions'}
        </p>
        
        {/* Stats Row - Compact */}
        <div className="flex items-center justify-between">
          {/* Member Avatars */}
          <div className="flex -space-x-1">
            {roomStats?.memberProfiles && roomStats.memberProfiles.length > 0 ? (
              roomStats.memberProfiles.slice(0, 3).map((profile) => (
                <Avatar key={profile.id} className="h-4 w-4 border border-white/50">
                  <AvatarImage 
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${profile.id}`} 
                  />
                  <AvatarFallback className="text-[6px] bg-white/20 text-white">
                    {(profile.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))
            ) : (
              [1, 2, 3].map((i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-white/20 border border-white/30" />
              ))
            )}
          </div>
          
          {/* Count */}
          <div className="flex items-center gap-1 text-white/80">
            <Users className="h-2.5 w-2.5" />
            <span className="text-[9px]">{roomStats?.memberCount || 0}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
