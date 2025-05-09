
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { rooms } from '@/services/dataService';

export function RoomsList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rooms.map((room) => (
        <Link key={room.id} to={`/room/${room.id}`}>
          <Card className={`p-6 hover:shadow-md transition-shadow border-l-4 border-l-${room.id} h-full`}>
            <h3 className="text-lg font-medium mb-1">{room.name}</h3>
            <p className="text-muted-foreground text-sm">{room.description}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
