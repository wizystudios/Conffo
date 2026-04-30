import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Compass, Sparkles } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ConffoRoomCard } from '@/components/ConffoRoomCard';
import { WAPageHeader } from '@/components/WAPageHeader';
import { HomeUserCircles } from '@/components/HomeUserCircles';
import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/services/supabaseDataService';

type HomeTab = 'all' | 'chats' | 'confessions';

export default function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HomeTab>('all');

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });

  return (
    <Layout showNavBar={false}>
      <div className="max-w-lg mx-auto pb-20">
        <WAPageHeader
          title="Rooms"
          searchPlaceholder="Search rooms, people, confessions"
          onSearchClick={() => navigate('/search')}
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'chats', label: 'Chats' },
            { id: 'confessions', label: 'Confessions' },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as HomeTab)}
        />

        {/* People circles row - always visible on All */}
        {activeTab === 'all' && (
          <HomeUserCircles onUserTap={(userId) => navigate(`/user/${userId}`)} />
        )}

        <div className="px-0">
          {activeTab === 'chats' ? (
            <EmptyHint
              icon={<MessageCircle className="h-12 w-12" />}
              title="Open your conversations"
              hint="Tap below to view all your DMs and communities."
              ctaLabel="Go to Chats"
              onCta={() => navigate('/chat')}
            />
          ) : activeTab === 'confessions' ? (
            <EmptyHint
              icon={<Compass className="h-12 w-12" />}
              title="Discover confessions"
              hint="Browse a vertical Instagram-style feed."
              ctaLabel="Open Explore"
              onCta={() => navigate('/search')}
            />
          ) : isLoading ? (
            <div className="space-y-3 py-4 px-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <EmptyHint
              icon={<Sparkles className="h-12 w-12" />}
              title="No rooms yet"
              hint="Check back soon."
            />
          ) : (
            <div className="divide-y divide-border/40">
              {rooms.map((room, index) => (
                <ConffoRoomCard key={room.id} room={room} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function EmptyHint({
  icon,
  title,
  hint,
  ctaLabel,
  onCta,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-muted-foreground text-[13px] mb-4">{hint}</p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="px-5 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-[13px] active:scale-95 transition-transform"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
