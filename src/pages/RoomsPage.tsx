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

export default function RoomsPage() {
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
        <div className="sticky top-0 z-20 conffo-glass-card rounded-none px-4 py-3 flex items-center justify-between">
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
          <h2 className="text-xl font-bold mb-1">Welcome back 👋</h2>
          <p className="text-sm text-muted-foreground">Where do you want to confess today?</p>
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-4">
          <Button
            variant="outline"
            className="w-full h-11 rounded-2xl gap-2 justify-start px-4 conffo-glass-card border-0"
            onClick={() => setShowCommunitySearch(true)}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Search Confession Groups...</span>
          </Button>
        </div>

        {/* Rooms List */}
        <div className="px-4 space-y-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="conffo-glass-card h-20 rounded-2xl animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </>
          ) : (
            rooms.map((room, index) => (
              <ConffoRoomCard key={room.id} room={room} index={index} />
            ))
          )}
        </div>

        {/* Post a Confession Button */}
        {isAuthenticated && (
          <div className="fixed bottom-20 left-4 right-4">
            <Button
              onClick={() => navigate('/create-post')}
              className="w-full h-12 rounded-full conffo-confess-btn text-white font-medium shadow-lg shadow-primary/30"
            >
              <Plus className="h-5 w-5 mr-2" />
              Post a Confession...
            </Button>
          </div>
        )}

        <CommunitySearchModal
          isOpen={showCommunitySearch}
          onClose={() => setShowCommunitySearch(false)}
        />
      </div>
    </Layout>
  );
}
