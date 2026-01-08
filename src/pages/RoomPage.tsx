import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { getConfessions, getRooms } from '@/services/supabaseDataService';
import { Confession, Room, RoomInfo } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { CommunityList } from '@/components/CommunityList';
import { UnifiedChatInterface } from '@/components/UnifiedChatInterface';
import { CreateCommunityModal } from '@/components/CreateCommunityModal';
import { CommunityMembersList } from '@/components/CommunityMembersList';
import { Community } from '@/services/communityService';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'confessions' | 'communities'>('confessions');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [communitiesKey, setCommunitiesKey] = useState(0);

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
  
  const handleConfessionSuccess = () => {
    refetch();
  };

  const handleCommunityCreated = () => {
    setCommunitiesKey(prev => prev + 1);
  };
  
  if (!roomInfo) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">Room Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The room you're looking for doesn't exist.
          </p>
          <Link to="/rooms">
            <Button>View All Rooms</Button>
          </Link>
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
  
  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center p-2 border-b border-border sticky top-0 bg-background z-10">
          <Link to="/rooms" className="mr-2">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{roomInfo.name}</h1>
            <p className="text-xs text-muted-foreground truncate">{roomInfo.description}</p>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'confessions' | 'communities')} className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-11 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger 
              value="confessions" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Confessions
            </TabsTrigger>
            <TabsTrigger 
              value="communities" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Communities
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="confessions" className="mt-0">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading confessions...</p>
            ) : confessions.length > 0 ? (
              <div className="space-y-0">
                {confessions.map((confession) => (
                  <InstagramConfessionCard 
                    key={confession.id} 
                    confession={confession}
                    onUpdate={handleConfessionSuccess} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No confessions in this room yet. Be the first!
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="communities" className="mt-0 p-4">
            <CommunityList
              key={communitiesKey}
              roomId={roomId}
              onSelectCommunity={setSelectedCommunity}
              onCreateCommunity={() => setShowCreateCommunity(true)}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={showCreateCommunity}
        onClose={() => setShowCreateCommunity(false)}
        roomId={roomId || ''}
        onCreated={handleCommunityCreated}
      />
    </Layout>
  );
}
