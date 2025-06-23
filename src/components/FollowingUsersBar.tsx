
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { StoryRing } from '@/components/story/StoryRing';
import { hasActiveStory } from '@/services/storyService';

interface FollowedUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  hasStory: boolean;
}

export function FollowingUsersBar() {
  const { user, isAuthenticated } = useAuth();
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFollowedUsers = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get users that current user follows
        const { data: followData, error } = await supabase
          .from('user_follows')
          .select(`
            following_id,
            profiles:following_id (
              id,
              username,
              avatar_url
            )
          `)
          .eq('follower_id', user.id);

        if (error) {
          console.error('Error fetching followed users:', error);
          return;
        }

        if (followData) {
          const users: FollowedUser[] = [];
          
          for (const follow of followData) {
            const profile = follow.profiles;
            if (profile) {
              const userHasStory = await hasActiveStory(profile.id);
              users.push({
                id: profile.id,
                username: profile.username,
                avatar_url: profile.avatar_url,
                hasStory: userHasStory
              });
            }
          }
          
          setFollowedUsers(users);
        }
      } catch (error) {
        console.error('Error in fetchFollowedUsers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowedUsers();
  }, [user, isAuthenticated]);

  if (!isAuthenticated || isLoading || followedUsers.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center space-x-4 overflow-x-auto scrollbar-thin">
        {followedUsers.map((followedUser) => (
          <div key={followedUser.id} className="flex flex-col items-center min-w-16">
            {followedUser.hasStory ? (
              <StoryRing
                userId={followedUser.id}
                username={followedUser.username}
                avatarUrl={followedUser.avatar_url}
                size="md"
              />
            ) : (
              <Link to={`/user/${followedUser.id}`}>
                <Avatar className="h-12 w-12 border-2 border-transparent hover:border-muted transition-colors">
                  <AvatarImage 
                    src={followedUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${followedUser.id}`} 
                    alt={followedUser.username || 'User'} 
                  />
                  <AvatarFallback>
                    {followedUser.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
            <span className="text-xs text-center mt-1 truncate w-16">
              {followedUser.username || 'User'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
