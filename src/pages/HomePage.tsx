import { useState } from 'react';
import { Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ConffoRoomCard } from '@/components/ConffoRoomCard';
import { CommunitySearchModal } from '@/components/CommunitySearchModal';
import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/services/supabaseDataService';

// Home Page = Simple Rooms List
export default function HomePage() {
  const [showCommunitySearch, setShowCommunitySearch] = useState(false);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms
  });

  return (
    <Layout showNavBar={true}>
      <div className="max-w-lg mx-auto pb-20">
        {/* Simple Header */}
        <div className="px-4 py-4 border-b border-border/30">
          <h1 className="text-xl font-bold text-center">Conffo</h1>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3">
          <button
            onClick={() => setShowCommunitySearch(true)}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/50 text-muted-foreground text-sm"
          >
            <Search className="h-4 w-4" />
            <span>Search rooms...</span>
          </button>
        </div>

        {/* Rooms List - Simple, no boxes */}
        <div className="px-4">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className="h-14 rounded-lg bg-muted/30 animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No rooms available yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
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
