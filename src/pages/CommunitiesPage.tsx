import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getUserCommunities, Community } from '@/services/communityService';
import { UnifiedChatInterface } from '@/components/UnifiedChatInterface';
import { CommunityMembersList } from '@/components/CommunityMembersList';
import { formatDistanceToNow } from 'date-fns';

export default function CommunitiesPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const { data: communities = [], isLoading, refetch } = useQuery({
    queryKey: ['user-communities', user?.id],
    queryFn: getUserCommunities,
    enabled: isAuthenticated
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
          <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Join Communities</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sign in to create and join communities with your Fans & Crew
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  // If a community is selected, show the chat
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

  return (
    <Layout>
      <div className="pt-16 pb-20 px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">My Communities</h1>
          <p className="text-sm text-muted-foreground">
            Chat with your groups
          </p>
        </div>

        {/* Communities List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No communities yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Go to a room to create or join a community
            </p>
            <Button onClick={() => navigate('/rooms')} variant="outline">
              Browse Rooms
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {communities.map((community) => (
              <button
                key={community.id}
                onClick={() => setSelectedCommunity(community)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card hover:bg-muted transition-colors border border-border"
              >
                <Avatar className="h-14 w-14">
                  <AvatarImage src={community.imageUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                    {community.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-left min-w-0">
                  <h3 className="font-semibold truncate">{community.name}</h3>
                  {community.description && (
                    <p className="text-sm text-muted-foreground truncate">{community.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {community.memberCount || 0} members • #{community.roomId}
                  </p>
                </div>
                
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Floating button to browse rooms */}
        <Button
          onClick={() => navigate('/rooms')}
          className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </Layout>
  );
}