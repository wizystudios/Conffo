import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { RoomsList } from '@/components/RoomsList';
import { CommunitySearchModal } from '@/components/CommunitySearchModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/services/supabaseDataService';

export default function RoomsPage() {
  const { isAuthenticated } = useAuth();
  const [showCommunitySearch, setShowCommunitySearch] = useState(false);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms
  });

  return (
    <Layout>
      <div className="space-y-4 p-3 pt-16">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold mb-1">Confession Rooms</h1>
            <p className="text-xs text-muted-foreground">
              Choose a room to browse or share confessions
            </p>
          </div>

          {isAuthenticated && (
            <Button
              variant="outline"
              className="h-9 rounded-full gap-2"
              onClick={() => setShowCommunitySearch(true)}
            >
              <Search className="h-4 w-4" />
              Communities
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">Loading rooms...</p>
          </div>
        ) : (
          <RoomsList rooms={rooms} />
        )}

        <CommunitySearchModal
          isOpen={showCommunitySearch}
          onClose={() => setShowCommunitySearch(false)}
        />
      </div>
    </Layout>
  );
}
