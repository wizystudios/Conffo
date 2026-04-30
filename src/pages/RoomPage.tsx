import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, MessageSquare, Users, TrendingUp, MessageCircle, Plus } from 'lucide-react';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { BottomSlideModal } from '@/components/BottomSlideModal';
import { useAuth } from '@/context/AuthContext';
import { getConfessions, getRooms } from '@/services/supabaseDataService';
import { Room, Confession } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { CommunityList } from '@/components/CommunityList';
import { UnifiedChatInterface } from '@/components/UnifiedChatInterface';
import { CreateCommunityModal } from '@/components/CreateCommunityModal';
import { CommunityMembersList } from '@/components/CommunityMembersList';
import { CommunityOnboardingTour } from '@/components/CommunityOnboardingTour';
import { Community } from '@/services/communityService';
import { ImmersivePostViewer } from '@/components/ImmersivePostViewer';

const getRoomIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('heart') || lower.includes('relationship') || lower.includes('love')) return '💔';
  if (lower.includes('mental') || lower.includes('health')) return '🧠';
  if (lower.includes('adult') || lower.includes('18')) return '🔥';
  if (lower.includes('student') || lower.includes('school')) return '🎓';
  if (lower.includes('random')) return '🎲';
  return '💬';
};

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<'confessions' | 'communities'>('confessions');
  const [sortTab, setSortTab] = useState<'new' | 'supported' | 'discussed'>('new');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [communitiesKey, setCommunitiesKey] = useState(0);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [showNavSheet, setShowNavSheet] = useState(false);
  const [immersiveStartIndex, setImmersiveStartIndex] = useState<number | null>(null);

  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: getRooms });
  const roomInfo = rooms.find(r => r.id === roomId);

  const { data: confessions = [], isLoading, refetch } = useQuery({
    queryKey: ['confessions', roomId, user?.id],
    queryFn: () => getConfessions(roomId as Room, user?.id),
    enabled: !!roomId,
  });

  const sortedConfessions = useMemo(() => {
    return [...confessions].sort((a, b) => {
      if (sortTab === 'new') return b.timestamp - a.timestamp;
      if (sortTab === 'supported') {
        return ((b.reactions?.heart || 0) + (b.reactions?.like || 0)) - ((a.reactions?.heart || 0) + (a.reactions?.like || 0));
      }
      return (b.commentCount || 0) - (a.commentCount || 0);
    });
  }, [confessions, sortTab]);

  const handleConfessionSuccess = () => { refetch(); };
  const handleCommunityCreated = () => {
    setCommunitiesKey(prev => prev + 1);
    setShowOnboardingTour(true);
  };

  if (!roomInfo) {
    return (
      <Layout>
        <div className="text-center py-10 px-4">
          <h1 className="text-xl font-bold mb-4">Room Not Found</h1>
          <Link to="/"><Button>View All Rooms</Button></Link>
        </div>
      </Layout>
    );
  }

  if (selectedCommunity) {
    return (
      <div className="fixed inset-0 z-50 bg-background lg:flex lg:items-center lg:justify-center">
        <div className="h-full w-full lg:h-[90vh] lg:w-[600px] lg:max-w-[95vw] lg:rounded-2xl lg:overflow-hidden lg:border lg:border-border">
          <UnifiedChatInterface
            community={selectedCommunity}
            onBack={() => setSelectedCommunity(null)}
            onShowMembers={() => setShowMembers(true)}
            onAddMembers={() => setShowAddMembers(true)}
          />
        </div>
        <CommunityMembersList isOpen={showMembers} onClose={() => setShowMembers(false)} communityId={selectedCommunity.id} creatorId={selectedCommunity.creatorId} />
        <CommunityMembersList isOpen={showAddMembers} onClose={() => setShowAddMembers(false)} communityId={selectedCommunity.id} creatorId={selectedCommunity.creatorId} isAddMode />
      </div>
    );
  }

  const roomIcon = getRoomIcon(roomInfo.name);

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border/30">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xl">{roomIcon}</span>
                <h1 className="font-bold">{roomInfo.name}</h1>
              </div>
            </div>

            <button
              onClick={() => setShowNavSheet(true)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-muted/50"
            >
              {activeView === 'confessions'
                ? (sortTab === 'new' ? 'New' : sortTab === 'supported' ? 'Top' : 'Discussed')
                : 'Communities'}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {activeView === 'communities' ? (
          <div className="p-4">
            <CommunityList key={communitiesKey} roomId={roomId || ''} onSelectCommunity={setSelectedCommunity} onCreateCommunity={() => setShowCreateCommunity(true)} />
          </div>
        ) : isLoading ? (
          <div className="space-y-4 p-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-72 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : sortedConfessions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-muted-foreground">No confessions yet.</p>
          </div>
        ) : (
          // Instagram-style vertical feed
          <div className="divide-y divide-border/40">
            {sortedConfessions.map((c: Confession) => (
              <InstagramConfessionCard
                key={c.id}
                confession={c}
                onUpdate={handleConfessionSuccess}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {isAuthenticated && activeView === 'confessions' && (
        <button
          onClick={() => navigate('/create-post')}
          className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform duration-150"
          aria-label="New confession"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <CreateCommunityModal isOpen={showCreateCommunity} onClose={() => setShowCreateCommunity(false)} roomId={roomId || ''} onCreated={handleCommunityCreated} />
      <CommunityOnboardingTour isOpen={showOnboardingTour} onClose={() => setShowOnboardingTour(false)} communityName={roomInfo?.name || 'Community'} />

      {/* Navigation Bottom Sheet */}
      <BottomSlideModal isOpen={showNavSheet} onClose={() => setShowNavSheet(false)} title="Navigate">
        <div className="px-4 pb-6 space-y-2">
          <p className="text-xs text-muted-foreground px-2 pt-1 pb-2 uppercase tracking-wider font-medium">Confessions</p>
          {[
            { label: 'New', icon: <MessageSquare className="h-4 w-4" />, sort: 'new' as const },
            { label: 'Top', icon: <TrendingUp className="h-4 w-4" />, sort: 'supported' as const },
            { label: 'Discussed', icon: <MessageCircle className="h-4 w-4" />, sort: 'discussed' as const },
          ].map((item) => (
            <button
              key={item.sort}
              onClick={() => { setActiveView('confessions'); setSortTab(item.sort); setShowNavSheet(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeView === 'confessions' && sortTab === item.sort
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}

          <div className="h-px bg-border my-3" />

          <button
            onClick={() => { setActiveView('communities'); setShowNavSheet(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeView === 'communities' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Users className="h-4 w-4" />
            <span className="font-medium text-sm">Communities</span>
          </button>
        </div>
      </BottomSlideModal>

      {/* Immersive viewer for tapped confession - shows ALL room confessions starting at index */}
      {immersiveStartIndex !== null && sortedConfessions.length > 0 && (
        <ImmersivePostViewer
          confessions={sortedConfessions}
          startIndex={immersiveStartIndex}
          onClose={() => setImmersiveStartIndex(null)}
          onUpdate={handleConfessionSuccess}
        />
      )}
    </Layout>
  );
}
