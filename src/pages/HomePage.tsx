import { useState } from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ConffoRoomCard } from '@/components/ConffoRoomCard';
import { CommunitySearchModal } from '@/components/CommunitySearchModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/services/supabaseDataService';
import { useNavigate } from 'react-router-dom';

// Home Page = Rooms List (as per design)
export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showCommunitySearch, setShowCommunitySearch] = useState(false);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms
  });

  return (
    <Layout>
      <div className="min-h-screen pb-24">
        {/* Conffo Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold conffo-text-gradient">Conffo</h1>
          <button 
            onClick={() => navigate('/notifications')}
            className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Welcome Section */}
        <div className="px-4 py-6">
          <h2 className="text-xl font-bold mb-1">Find a Room To</h2>
          <p className="text-lg text-muted-foreground">Share Your Confessions</p>
        </div>

        {/* Rooms Grid - 2 column layout like the design */}
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
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rooms.map((room, index) => (
                <ConffoRoomCard key={room.id} room={room} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Search for rooms */}
        <div className="px-4 mt-6">
          <Button
            variant="outline"
            className="w-full h-11 rounded-full gap-2 justify-start px-4 bg-muted/30 border-0"
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
