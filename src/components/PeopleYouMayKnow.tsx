import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { PeopleYouMayKnowModal } from '@/components/PeopleYouMayKnowModal';

interface SuggestedUser {
  id: string;
  username: string;
  avatar_url: string | null;
  mutualFollowers?: number;
}

export function PeopleYouMayKnow() {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      if (!user) return;

      try {
        // Get users that the current user is NOT following
        const { data: followingData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];
        
        // Get random users excluding current user and already followed users
        const { data: usersData, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', user.id)
          .not('id', 'in', followingIds.length > 0 ? `(${followingIds.join(',')})` : '()')
          .limit(3);

        if (error) throw error;

        const users = (usersData || []).map(user => ({
          ...user,
          username: user.username || 'Anonymous User',
          mutualFollowers: Math.floor(Math.random() * 5) // Simulate mutual followers
        }));

        setSuggestedUsers(users);
      } catch (error) {
        console.error('Error fetching suggested users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestedUsers();
  }, [user]);

  if (isLoading || suggestedUsers.length === 0) return null;

  return (
    <>
      <Card className="w-full cursor-pointer" onClick={() => setIsModalOpen(true)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              People You May Know
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {suggestedUsers.slice(0, 3).map((suggestedUser) => (
              <div key={suggestedUser.id} className="flex flex-col items-center space-y-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={suggestedUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${suggestedUser.id}`} 
                    alt={suggestedUser.username} 
                  />
                  <AvatarFallback>
                    {suggestedUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs font-medium truncate max-w-[60px]">
                  {suggestedUser.username}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <PeopleYouMayKnowModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}