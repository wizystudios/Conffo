import { useState, useEffect } from 'react';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Community, getCommunitiesByRoom, getUserCommunities } from '@/services/communityService';
import { useAuth } from '@/context/AuthContext';

interface CommunityListProps {
  roomId?: string;
  onSelectCommunity: (community: Community) => void;
  onCreateCommunity: () => void;
  showUserCommunities?: boolean;
}

export function CommunityList({ 
  roomId, 
  onSelectCommunity, 
  onCreateCommunity,
  showUserCommunities = false 
}: CommunityListProps) {
  const { isAuthenticated } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCommunities();
  }, [roomId, showUserCommunities]);

  const loadCommunities = async () => {
    setIsLoading(true);
    
    let data: Community[];
    if (showUserCommunities) {
      data = await getUserCommunities();
    } else if (roomId) {
      data = await getCommunitiesByRoom(roomId);
    } else {
      data = [];
    }
    
    setCommunities(data);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Create Community Button */}
      {isAuthenticated && roomId && (
        <Button
          variant="outline"
          onClick={onCreateCommunity}
          className="w-full h-14 rounded-xl border-dashed justify-start gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium">Create Community</span>
        </Button>
      )}

      {/* Communities */}
      {communities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No communities yet</p>
          {isAuthenticated && roomId && (
            <p className="text-xs mt-1">Create one to start chatting!</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {communities.map((community) => (
            <button
              key={community.id}
              onClick={() => onSelectCommunity(community)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={community.imageUrl} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                  {community.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm truncate">{community.name}</p>
                {community.description && (
                  <p className="text-xs text-muted-foreground truncate">{community.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {community.memberCount || 0} members
                </p>
              </div>
              
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
