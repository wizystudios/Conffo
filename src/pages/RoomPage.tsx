import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Plus, MessageCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { ConffoConfessionCard } from '@/components/ConffoConfessionCard';
import { SwipeableConfessionViewer } from '@/components/SwipeableConfessionViewer';
import { useAuth } from '@/context/AuthContext';
import { getConfessions, getRooms } from '@/services/supabaseDataService';
import { Room } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CommunityList } from '@/components/CommunityList';
import { UnifiedChatInterface } from '@/components/UnifiedChatInterface';
import { CreateCommunityModal } from '@/components/CreateCommunityModal';
import { CommunityMembersList } from '@/components/CommunityMembersList';
import { Community } from '@/services/communityService';
import { ImprovedCommentModal } from '@/components/ImprovedCommentModal';
import { supabase } from '@/integrations/supabase/client';
import { haptic } from '@/utils/hapticFeedback';
import { toast } from '@/hooks/use-toast';

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
  
  const [activeTab, setActiveTab] = useState<'new' | 'supported' | 'discussed'>('new');
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('list');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [communitiesKey, setCommunitiesKey] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedConfessionId, setSelectedConfessionId] = useState<string | null>(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  
  const roomInfo = rooms.find(r => r.id === roomId);
  
  const { data: confessions = [], isLoading, refetch } = useQuery({
    queryKey: ['confessions', roomId, user?.id],
    queryFn: () => getConfessions(roomId as Room, user?.id),
    enabled: !!roomId,
  });

  // Sort confessions based on active tab
  const sortedConfessions = [...confessions].sort((a, b) => {
    if (activeTab === 'new') {
      return b.timestamp - a.timestamp;
    } else if (activeTab === 'supported') {
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
  };

  const handleOpenComments = (confessionId: string) => {
    setSelectedConfessionId(confessionId);
    setShowComments(true);
  };

  const handleLike = async (confessionId: string) => {
    if (!user) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }
    
    haptic.light();
    
    // Check if already liked
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('confession_id', confessionId)
      .eq('user_id', user.id)
      .eq('type', 'heart')
      .maybeSingle();
    
    if (existing) {
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id);
    } else {
      await supabase
        .from('reactions')
        .insert({
          confession_id: confessionId,
          user_id: user.id,
          type: 'heart'
        });
    }
    
    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['confessions'] });
    queryClient.invalidateQueries({ queryKey: ['reactions'] });
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

  // If a community is selected, show full-screen chat
  if (selectedCommunity) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <UnifiedChatInterface
          community={selectedCommunity}
          onBack={() => setSelectedCommunity(null)}
          onShowMembers={() => setShowMembers(true)}
          onAddMembers={() => setShowAddMembers(true)}
        />
        
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
        {/* Header - Simplified, no notification icon */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/30">
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
          
          <p className="text-xs text-muted-foreground text-center pb-2">
            {roomInfo.description || 'Anonymous confessions'}
          </p>

          {/* Member avatars + Join/Rules buttons */}
          <div className="flex items-center justify-center gap-4 pb-3">
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {['💔', '😢', '😤', '🫂'].map((emoji, i) => (
                  <div 
                    key={i}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-background"
                  >
                    <span className="text-xs">{emoji}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Button
              variant={isJoined ? "secondary" : "default"}
              size="sm"
              onClick={() => setIsJoined(!isJoined)}
              className="rounded-full px-4 h-8"
            >
              {isJoined ? 'Joined' : 'Join'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4 h-8"
            >
              <Shield className="h-3 w-3 mr-1" />
              Rules
            </Button>
          </div>

          {/* Sort tabs */}
          <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {['new', 'supported', 'discussed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tab === 'new' ? 'New' : tab === 'supported' ? 'Most Supported' : 'Most Discussed'}
              </button>
            ))}
          </div>
        </div>

        {/* Communities Section */}
        <div className="px-4 py-3 border-b border-border/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Communities</h3>
          </div>
          <CommunityList 
            key={communitiesKey}
            roomId={roomId || ''} 
            onSelectCommunity={setSelectedCommunity}
            onCreateCommunity={() => setShowCreateCommunity(true)}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="conffo-glass-card h-32 animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'swipe' ? (
          <div className="pt-4">
            <SwipeableConfessionViewer 
              confessions={sortedConfessions} 
              onUpdate={handleConfessionSuccess}
            />
          </div>
        ) : (
          <div className="pt-2">
            {sortedConfessions.length > 0 ? (
              sortedConfessions.map((confession, index) => (
                <div key={confession.id} className="relative">
                  <ConffoConfessionCard 
                    confession={confession}
                    onUpdate={handleConfessionSuccess}
                    index={index}
                  />
                  {/* Inline action buttons for like/comment without clicking confession */}
                  <div className="absolute bottom-16 right-6 flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(confession.id);
                      }}
                      className="p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background"
                    >
                      <Heart className="h-4 w-4 text-pink-400" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenComments(confession.id);
                      }}
                      className="p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background"
                    >
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="conffo-glass-card p-8 mx-4 text-center">
                <p className="text-muted-foreground">
                  No confessions in this room yet. Be the first!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={showCreateCommunity}
        onClose={() => setShowCreateCommunity(false)}
        roomId={roomId || ''}
        onCreated={handleCommunityCreated}
      />

      {/* Comments Modal */}
      {selectedConfessionId && (() => {
        const selectedConfession = sortedConfessions.find(c => c.id === selectedConfessionId);
        return selectedConfession ? (
          <ImprovedCommentModal
            confessionId={selectedConfessionId}
            confessionContent={selectedConfession.content}
            confessionAuthor="Anonymous"
            confessionMediaUrl={selectedConfession.mediaUrl || undefined}
            confessionMediaType={selectedConfession.mediaType === 'audio' ? undefined : selectedConfession.mediaType}
            isOpen={showComments}
            onClose={() => {
              setShowComments(false);
              setSelectedConfessionId(null);
            }}
          />
        ) : null;
      })()}
    </Layout>
  );
}
