import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ConffoRoomCard } from '@/components/ConffoRoomCard';
import { CommunitySearchModal } from '@/components/CommunitySearchModal';
import { HomeUserCircles } from '@/components/HomeUserCircles';
import { WAPageHeader } from '@/components/WAPageHeader';
import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/services/supabaseDataService';

export default function HomePage() {
  const [showCommunitySearch, setShowCommunitySearch] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'favorites'>('all');

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });

  return (
    <Layout showNavBar={false}>
      <div className="max-w-lg mx-auto pb-20">
        <WAPageHeader
          title="Rooms"
          searchPlaceholder="Search rooms..."
          onSearchClick={() => setShowCommunitySearch(true)}
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'favorites', label: 'Favorites' },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
        />

        <HomeUserCircles />

        <div className="px-0">
          {isLoading ? (
            <div className="space-y-3 py-4 px-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No rooms available yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
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
