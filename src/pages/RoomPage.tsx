import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, MessageSquare, Users, TrendingUp, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { BottomSlideModal } from '@/components/BottomSlideModal';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

interface RoomUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

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
  const [immersiveUser, setImmersiveUser] = useState<RoomUser | null>(null);
  const [showAllImmersive, setShowAllImmersive] = useState(false);
  const [immersiveStartIndex, setImmersiveStartIndex] = useState(0);
  const [viewedUserIds, setViewedUserIds] = useState<Set<string>>(new Set());

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  
  const roomInfo = rooms.find(r => r.id === roomId);

  const { data: roomUsers = [] } = useQuery({
    queryKey: ['room-users', roomId],
    queryFn: async () => {
      const { data: recentPosts } = await supabase
        .from('confessions')
        .select('user_id')
        .eq('room_id', roomId)
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      
      const uniqueIds = [...new Set(recentPosts?.map(p => p.user_id).filter(Boolean) || [])].slice(0, 20);
      if (uniqueIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, username')
        .in('id', uniqueIds);
      
      return (profiles || []) as RoomUser[];
    },
    enabled: !!roomId,
  });
  
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

  const userPosts = useMemo(() => {
    if (!immersiveUser) return [];
    return sortedConfessions.filter(c => c.userId === immersiveUser.id);
  }, [immersiveUser, sortedConfessions]);
  
  const handleConfessionSuccess = () => { refetch(); };

  const handleCommunityCreated = () => {
    setCommunitiesKey(prev => prev + 1);
    setShowOnboardingTour(true);
  };

  const handleUserCircleTap = (u: RoomUser) => {
    const posts = sortedConfessions.filter(c => c.userId === u.id);
    if (posts.length > 0) {
      setImmersiveUser(u);
      // Mark as viewed
      setViewedUserIds(prev => new Set([...prev, u.id]));
    }
  };

  const handleViewAll = () => {
    setImmersiveStartIndex(0);
    setShowAllImmersive(true);
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
        ) : (
          <>
            {/* User grid - like search page layout */}
            {roomUsers.length > 0 && (
              <div className="px-4 py-3 border-b border-border/30">
                <div className="grid grid-cols-5 gap-3">
                  {/* View All button */}
                  <button 
                    onClick={handleViewAll}
                    className="flex flex-col items-center"
                  >
                    <div className="h-14 w-14 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center bg-primary/5">
                      <span className="text-lg">👁</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">All</span>
                  </button>
                  
                  {roomUsers.map((u) => {
                    const postCount = sortedConfessions.filter(c => c.userId === u.id).length;
                    if (postCount === 0) return null;
                    const isViewed = viewedUserIds.has(u.id);
                    return (
                      <button 
                        key={u.id} 
                        onClick={() => handleUserCircleTap(u)}
                        className="flex flex-col items-center"
                      >
                        <div className="relative">
                          <div className={`h-14 w-14 rounded-full p-[2px] ${isViewed ? 'bg-muted' : 'bg-gradient-to-tr from-primary to-primary/50'}`}>
                            <Avatar className="h-full w-full border-2 border-background">
                              <AvatarImage src={u.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${u.id}`} />
                              <AvatarFallback className="text-xs">{u.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                            {postCount}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 truncate w-14 text-center">
                          {u.username || 'User'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary info */}
            {!isLoading && sortedConfessions.length > 0 && (
              <div className="px-4 py-3 text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{sortedConfessions.length}</span> confessions
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (<div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />))}
              </div>
            ) : sortedConfessions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <p className="text-muted-foreground">No confessions yet.</p>
              </div>
            ) : null}
          </>
        )}
      </div>
      
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
              activeView === 'communities'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            <Users className="h-4 w-4" />
            <span className="font-medium text-sm">Communities</span>
          </button>
        </div>
      </BottomSlideModal>

      {/* Immersive viewer for user circle tap */}
      {immersiveUser && userPosts.length > 0 && (
        <ImmersivePostViewer
          confessions={userPosts}
          onClose={() => setImmersiveUser(null)}
          onUpdate={handleConfessionSuccess}
          userName={immersiveUser.username || 'Anonymous'}
          userAvatar={immersiveUser.avatar_url || ''}
        />
      )}

      {/* Immersive viewer for all posts */}
      {showAllImmersive && sortedConfessions.length > 0 && (
        <ImmersivePostViewer
          confessions={sortedConfessions}
          startIndex={immersiveStartIndex}
          onClose={() => setShowAllImmersive(false)}
          onUpdate={handleConfessionSuccess}
        />
      )}
    </Layout>
  );
}
