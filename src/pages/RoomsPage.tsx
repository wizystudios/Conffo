
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RoomsList } from '@/components/RoomsList';
import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/services/supabaseDataService';

export default function RoomsPage() {
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Confession Rooms</h1>
          <p className="text-muted-foreground">
            Choose a room to browse or share confessions
          </p>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading rooms...</p>
          </div>
        ) : (
          <RoomsList rooms={rooms} />
        )}
      </div>
    </Layout>
  );
}
