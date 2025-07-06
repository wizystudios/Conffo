
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
    const fetchAllUsers = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get all users except current user
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', user.id)
          .limit(20);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }

        const users: FollowedUser[] = [];
        
        for (const profile of (profiles || [])) {
          const userHasStory = await hasActiveStory(profile.id);
          users.push({
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            hasStory: userHasStory
          });
        }
        
        setFollowedUsers(users);
      } catch (error) {
        console.error('Error in fetchAllUsers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllUsers();
  }, [user, isAuthenticated]);

  if (!isAuthenticated || isLoading) {
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
