
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { RoomInfo } from '@/types';

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedRooms.map((room) => (
        <Card key={room.id} className={room.isPinned ? 'border-primary/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle>{room.name}</CardTitle>
            <CardDescription>{room.description}</CardDescription>
          </CardHeader>
          <CardFooter className="pt-2">
            <Link to={`/room/${room.id}`} className="w-full">
              <Button className="w-full" variant="outline">
                <MessageCircle className="mr-2 h-4 w-4" />
                Enter Room
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
