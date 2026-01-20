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
      <div className="space-y-4 p-4 pt-16">
        {/* Header section */}
        <div className="text-center py-4">
          <h1 className="text-xl font-bold mb-2">Find a Room To</h1>
          <h2 className="text-xl font-bold text-primary">Share Your Confessions</h2>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <RoomsList rooms={rooms} />
        )}
        
        {/* Search bar */}
        <div className="pt-4">
          <Button
            variant="outline"
            className="w-full h-10 rounded-full gap-2 justify-start px-4"
            onClick={() => setShowCommunitySearch(true)}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Search for rooms...</span>
          </Button>
        </div>

        <CommunitySearchModal
          isOpen={showCommunitySearch}
          onClose={() => setShowCommunitySearch(false)}
        />
      </div>
    </Layout>
  );
}
