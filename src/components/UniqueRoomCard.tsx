import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { RoomInfo } from '@/types';

interface UniqueRoomCardProps {
  room: RoomInfo;
  index: number;
}

// Unique color themes for each room card
const colorThemes = [
  {
    bg: 'from-rose-100 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/20',
    border: 'border-rose-200 dark:border-rose-800/50',
    accent: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    icon: '💔'
  },
  {
    bg: 'from-violet-100 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20',
    border: 'border-violet-200 dark:border-violet-800/50',
    accent: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
    icon: '👻'
  },
  {
    bg: 'from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20',
    border: 'border-amber-200 dark:border-amber-800/50',
    accent: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    icon: '😂'
  },
  {
    bg: 'from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    accent: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: '💬'
  },
  {
    bg: 'from-sky-100 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/20',
    border: 'border-sky-200 dark:border-sky-800/50',
    accent: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
    icon: '🎓'
  },
  {
    bg: 'from-fuchsia-100 to-pink-50 dark:from-fuchsia-900/30 dark:to-pink-900/20',
    border: 'border-fuchsia-200 dark:border-fuchsia-800/50',
    accent: 'bg-fuchsia-500',
    text: 'text-fuchsia-700 dark:text-fuchsia-300',
    icon: '💼'
  },
];

export function UniqueRoomCard({ room, index }: UniqueRoomCardProps) {
  const theme = colorThemes[index % colorThemes.length];
  
  // Pick icon based on room name keywords
  const getIcon = () => {
    const name = room.name.toLowerCase();
    if (name.includes('heart') || name.includes('love') || name.includes('relationship')) return '💔';
    if (name.includes('secret') || name.includes('anonymous')) return '👻';
    if (name.includes('fun') || name.includes('funny') || name.includes('laugh')) return '😂';
    if (name.includes('talk') || name.includes('chat') || name.includes('real')) return '💬';
    if (name.includes('school') || name.includes('college') || name.includes('study')) return '🎓';
    if (name.includes('work') || name.includes('job') || name.includes('office')) return '💼';
    if (name.includes('family') || name.includes('home')) return '🏠';
    if (name.includes('friend')) return '🤝';
    return theme.icon;
  };
  
  return (
    <Link to={`/room/${room.id}`} className="block">
      <div 
        className={`
          relative overflow-hidden rounded-2xl p-4
          bg-gradient-to-br ${theme.bg}
          border-2 ${theme.border}
          transition-all duration-300 ease-out
          hover:scale-[1.02] hover:shadow-xl
          active:scale-[0.98]
          cursor-pointer
          group
        `}
      >
        {/* Decorative corner accent */}
        <div className={`absolute top-0 right-0 w-16 h-16 ${theme.accent} opacity-10 rounded-bl-[3rem]`} />
        
        {/* Icon container */}
        <div className="relative mb-3">
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center
            bg-white/60 dark:bg-black/20
            backdrop-blur-sm
            shadow-sm
            group-hover:scale-110 transition-transform duration-300
          `}>
            <span className="text-3xl">{getIcon()}</span>
          </div>
          
          {/* Pinned indicator */}
          {room.isPinned && (
            <div className={`absolute -top-1 -right-1 w-5 h-5 ${theme.accent} rounded-full flex items-center justify-center`}>
              <span className="text-white text-[10px]">📌</span>
            </div>
          )}
        </div>
        
        {/* Room name */}
        <h3 className={`font-bold text-base mb-1 ${theme.text} line-clamp-1`}>
          {room.name}
        </h3>
        
        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">
          {room.description}
        </p>
        
        {/* Footer with member count */}
        <div className="flex items-center gap-1.5">
          <Users className={`h-3.5 w-3.5 ${theme.text}`} />
          <span className={`text-xs font-medium ${theme.text}`}>
            {Math.floor(Math.random() * 50) + 10}
          </span>
          <span className="text-xs text-muted-foreground">↗</span>
        </div>
      </div>
    </Link>
  );
}