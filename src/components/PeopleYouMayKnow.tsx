import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { FollowButton } from '@/components/FollowButton';

interface SuggestedUser {
  id: string;
  username: string;
  avatar_url: string | null;
  mutualFollowers?: number;
}

export function PeopleYouMayKnow() {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(new Set());
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
          .limit(6);

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

  const handleHideUser = (userId: string) => {
    setHiddenUsers(prev => new Set([...prev, userId]));
  };

  const visibleUsers = suggestedUsers.filter(user => !hiddenUsers.has(user.id));

  if (isLoading || visibleUsers.length === 0) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          People You May Know
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {visibleUsers.slice(0, 4).map((suggestedUser) => (
            <div
              key={suggestedUser.id}
              className="relative border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleHideUser(suggestedUser.id)}
              >
                <X className="h-3 w-3" />
              </Button>
              
              <div className="flex flex-col items-center space-y-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={suggestedUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${suggestedUser.id}`} 
                    alt={suggestedUser.username} 
                  />
                  <AvatarFallback>
                    {suggestedUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center">
                  <p className="font-medium text-sm truncate max-w-[80px]">
                    {suggestedUser.username}
                  </p>
                  {suggestedUser.mutualFollowers && suggestedUser.mutualFollowers > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {suggestedUser.mutualFollowers} mutual
                    </p>
                  )}
                </div>
                
                <FollowButton 
                  userId={suggestedUser.id} 
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}