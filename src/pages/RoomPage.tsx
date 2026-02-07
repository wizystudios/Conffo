import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { useAuth } from '@/context/AuthContext';
import { getConfessions, getRooms } from '@/services/supabaseDataService';
import { Room } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CommunityList } from '@/components/CommunityList';
import { UnifiedChatInterface } from '@/components/UnifiedChatInterface';
import { CreateCommunityModal } from '@/components/CreateCommunityModal';
import { CommunityMembersList } from '@/components/CommunityMembersList';
import { CommunityOnboardingTour } from '@/components/CommunityOnboardingTour';
import { Community } from '@/services/communityService';
import { supabase } from '@/integrations/supabase/client';

// Get room emoji icon
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
  const queryClient = useQueryClient();
  
  const [activeView, setActiveView] = useState<'confessions' | 'communities'>('confessions');
  const [sortTab, setSortTab] = useState<'new' | 'supported' | 'discussed'>('new');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [communitiesKey, setCommunitiesKey] = useState(0);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  
  const roomInfo = rooms.find(r => r.id === roomId);

  // Fetch room member avatars
  const { data: roomMembers } = useQuery({
    queryKey: ['room-members', roomId],
    queryFn: async () => {
      const { data: recentPosts } = await supabase
        .from('confessions')
        .select('user_id')
        .eq('room_id', roomId)
        .not('user_id', 'is', null)
        .limit(20);
      
      const uniqueIds = [...new Set(recentPosts?.map(p => p.user_id).filter(Boolean) || [])].slice(0, 5);
      
      if (uniqueIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, username')
        .in('id', uniqueIds);
      
      return profiles || [];
    },
    enabled: !!roomId,
  });
  
  const { data: confessions = [], isLoading, refetch } = useQuery({
    queryKey: ['confessions', roomId, user?.id],
    queryFn: () => getConfessions(roomId as Room, user?.id),
    enabled: !!roomId,
  });

  // Sort confessions based on active tab
  const sortedConfessions = [...confessions].sort((a, b) => {
    if (sortTab === 'new') {
      return b.timestamp - a.timestamp;
    } else if (sortTab === 'supported') {
      const aReactions = (a.reactions?.heart || 0) + (a.reactions?.like || 0);
      const bReactions = (b.reactions?.heart || 0) + (b.reactions?.like || 0);
      return bReactions - aReactions;
    } else {
      return (b.commentCount || 0) - (a.commentCount || 0);
    }
  });
  
  const handleConfessionSuccess = () => {
    refetch();
  };

  const handleCommunityCreated = () => {
    setCommunitiesKey(prev => prev + 1);
    // Show onboarding tour for the creator
    setShowOnboardingTour(true);
  };
  
  if (!roomInfo) {
    return (
      <Layout>
        <div className="text-center py-10 px-4">
          <div className="conffo-glass-card p-8">
            <h1 className="text-xl font-bold mb-4">Room Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The room you're looking for doesn't exist.
            </p>
            <Link to="/">
              <Button>View All Rooms</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // If a community is selected, show chat - centered on desktop
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
        <CommunityMembersList
          isOpen={showMembers}
          onClose={() => setShowMembers(false)}
          communityId={selectedCommunity.id}
          creatorId={selectedCommunity.creatorId}
        />
        
        <CommunityMembersList
          isOpen={showAddMembers}
          onClose={() => setShowAddMembers(false)}
          communityId={selectedCommunity.id}
          creatorId={selectedCommunity.creatorId}
          isAddMode
        />
      </div>
    );
  }

  const roomIcon = getRoomIcon(roomInfo.name);
  
  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-24">
        {/* Header - Clean, no notification icon */}
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
          </div>
          
          {/* Member count - simple text */}
          <div className="px-4 pb-2">
            <span className="text-xs text-muted-foreground">{roomMembers?.length || 0}+ members</span>
          </div>

          {/* Main View Toggle: Confessions vs Communities */}
          <div className="flex gap-1 mx-4 mb-2 p-0.5 bg-muted/30 rounded-full">
            <button
              onClick={() => setActiveView('confessions')}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeView === 'confessions'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Confessions
            </button>
            <button
              onClick={() => setActiveView('communities')}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeView === 'communities'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Communities
            </button>
          </div>

          {/* Sort tabs - only show for confessions view */}
          {activeView === 'confessions' && (
            <div className="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide">
              {['new', 'supported', 'discussed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSortTab(tab as any)}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap ${
                    sortTab === tab
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {tab === 'new' ? 'New' : tab === 'supported' ? 'Top' : 'Discussed'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content based on active view */}
        {activeView === 'communities' ? (
          <div className="p-4">
            <CommunityList 
              key={communitiesKey}
              roomId={roomId || ''} 
              onSelectCommunity={setSelectedCommunity}
              onCreateCommunity={() => setShowCreateCommunity(true)}
            />
          </div>
        ) : (
          <>
            {/* Unified confession cards - same as post page */}
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sortedConfessions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <p className="text-muted-foreground">No confessions in this room yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to share.</p>
              </div>
            ) : (
              <div>
                {sortedConfessions.map((confession) => (
                  <InstagramConfessionCard
                    key={confession.id}
                    confession={confession}
                    onUpdate={handleConfessionSuccess}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={showCreateCommunity}
        onClose={() => setShowCreateCommunity(false)}
        roomId={roomId || ''}
        onCreated={handleCommunityCreated}
      />

      {/* Community Onboarding Tour */}
      <CommunityOnboardingTour
        isOpen={showOnboardingTour}
        onClose={() => setShowOnboardingTour(false)}
        communityName={roomInfo?.name || 'Community'}
      />
    </Layout>
  );
}
