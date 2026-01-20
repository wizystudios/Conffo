import { useState } from 'react';
import { Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ConffoRoomCard } from '@/components/ConffoRoomCard';
import { CommunitySearchModal } from '@/components/CommunitySearchModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/services/supabaseDataService';

// Home Page = Rooms List (as per design)
export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [showCommunitySearch, setShowCommunitySearch] = useState(false);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms
  });

  return (
    <Layout>
      <div className="pb-24">
        {/* Search Bar - At top, easy to access */}
        <div className="px-4 py-3">
          <Button
            variant="outline"
            className="w-full h-10 rounded-full gap-2 justify-start px-4 bg-muted/30 border-border/30"
            onClick={() => setShowCommunitySearch(true)}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Search rooms...</span>
          </Button>
        </div>

        {/* Rooms Grid - 2 column layout, no scrolling needed */}
        <div className="px-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="aspect-[4/5] rounded-2xl bg-muted/50 animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No rooms available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rooms.map((room, index) => (
                <ConffoRoomCard key={room.id} room={room} index={index} />
              ))}
            </div>
          )}
        </div>

        <CommunitySearchModal
          isOpen={showCommunitySearch}
          onClose={() => setShowCommunitySearch(false)}
        />
      </div>
    </Layout>
  );
}
