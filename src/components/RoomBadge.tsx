
import { Room } from '@/types';
import { cn } from '@/lib/utils';

interface RoomBadgeProps {
  room: Room;
  className?: string;
}

export function RoomBadge({ room, className }: RoomBadgeProps) {
  return (
    <span className={cn(`room-badge room-badge-${room}`, className)}>
      {room.charAt(0).toUpperCase() + room.slice(1)}
    </span>
  );
}
