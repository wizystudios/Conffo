import { RoomInfo } from '@/types';
import { UniqueRoomCard } from './UniqueRoomCard';

interface RoomsListProps {
  rooms: RoomInfo[];
}

export function RoomsList({ rooms }: RoomsListProps) {
  // Sort rooms: pinned first, then alphabetically
  const sortedRooms = [...rooms].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.name.localeCompare(b.name);
  });
  
  return (
    <div className="grid grid-cols-2 gap-3">
      {sortedRooms.map((room, index) => (
        <UniqueRoomCard key={room.id} room={room} index={index} />
      ))}
    </div>
  );
}
