import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserCommunitiesProps {
  userId: string;
}

export function UserCommunities({ userId }: UserCommunitiesProps) {
  const navigate = useNavigate();

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ['user-communities', userId],
    queryFn: async () => {
      // Get communities the user is a member of
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId);

      if (!memberships || memberships.length === 0) return [];

      const communityIds = memberships.map(m => m.community_id);

      // Get community details
      const { data: communityData } = await supabase
        .from('communities')
        .select('id, name, image_url, description')
        .in('id', communityIds);

      return communityData || [];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-24 h-28 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="text-center py-4">
        <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No communities yet</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {communities.map((community) => (
        <button
          key={community.id}
          onClick={() => navigate('/chat')}
          className="flex-shrink-0 w-24 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-center"
        >
          <Avatar className="h-10 w-10 mx-auto mb-1">
            <AvatarImage src={community.image_url || undefined} alt={community.name} />
            <AvatarFallback className="text-xs bg-primary/20">
              {community.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="text-[10px] font-medium line-clamp-2">{community.name}</p>
        </button>
      ))}
    </div>
  );
}
