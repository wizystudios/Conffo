
import { Layout } from '@/components/Layout';
import { RoomsList } from '@/components/RoomsList';

export default function RoomsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Confession Rooms</h1>
          <p className="text-muted-foreground mb-6">
            Select a room to see topic-specific confessions.
          </p>
        </div>
        
        <RoomsList />
      </div>
    </Layout>
  );
}
