import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase, checkIfFollowing, addFollow } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { StoryRing } from '@/components/story/StoryRing';
import { hasActiveStory } from '@/services/storyService';
import { Plus, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string | null;
  avatar_url: string | null;
  hasStory: boolean;
  isFollowing: boolean;
  isCurrentUser?: boolean;
}

export function AllUsersBar() {
  const { user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllUsers = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get current user profile first
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (currentProfile) {
          const userHasStory = await hasActiveStory(currentProfile.id);
          setCurrentUserProfile({
            id: currentProfile.id,
            username: currentProfile.username,
            avatar_url: currentProfile.avatar_url,
            hasStory: userHasStory,
            isFollowing: false,
            isCurrentUser: true
          });
        }

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

        const userList: User[] = [];
        
        for (const profile of (profiles || [])) {
          const userHasStory = await hasActiveStory(profile.id);
          const isFollowing = await checkIfFollowing(user.id, profile.id);
          
          userList.push({
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            hasStory: userHasStory,
            isFollowing
          });
        }
        
        setUsers(userList);
      } catch (error) {
        console.error('Error in fetchAllUsers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllUsers();
  }, [user, isAuthenticated]);

  const handleCreatePost = () => {
    window.dispatchEvent(new Event('create-confession'));
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;
    
    try {
      await addFollow(user.id, targetUserId);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === targetUserId ? { ...u, isFollowing: true } : u
      ));
      
      toast({
        description: "Following user!",
      });
    } catch (error) {
      console.error('Error following user:', error);
      toast({
        variant: "destructive",
        description: "Failed to follow user"
      });
    }
  };

  if (!isAuthenticated || isLoading) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center space-x-4 overflow-x-auto scrollbar-thin">
        {/* Current User Profile with Plus Button */}
        {currentUserProfile && (
          <div className="flex flex-col items-center min-w-16 relative">
            {currentUserProfile.hasStory ? (
              <StoryRing
                userId={currentUserProfile.id}
                username={currentUserProfile.username}
                avatarUrl={currentUserProfile.avatar_url}
                size="md"
              />
            ) : (
              <Link to={`/user/${currentUserProfile.id}`}>
                <Avatar className="h-12 w-12 border-2 border-transparent hover:border-muted transition-colors">
                  <AvatarImage 
                    src={currentUserProfile.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${currentUserProfile.id}`} 
                    alt={currentUserProfile.username || 'Your Profile'} 
                  />
                  <AvatarFallback>
                    {currentUserProfile.username?.charAt(0).toUpperCase() || 'Y'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
            
            {/* Plus button for creating posts */}
            <Button
              size="sm"
              onClick={handleCreatePost}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
            
            <span className="text-xs text-center mt-1 truncate w-16">
              Your Story
            </span>
          </div>
        )}
        
        {users.map((userData) => (
          <div key={userData.id} className="flex flex-col items-center min-w-16 relative">
            {userData.hasStory ? (
              <StoryRing
                userId={userData.id}
                username={userData.username}
                avatarUrl={userData.avatar_url}
                size="md"
              />
            ) : (
              <Link to={`/user/${userData.id}`}>
                <Avatar className="h-12 w-12 border-2 border-transparent hover:border-muted transition-colors">
                  <AvatarImage 
                    src={userData.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${userData.id}`} 
                    alt={userData.username || 'User'} 
                  />
                  <AvatarFallback>
                    {userData.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
            
            {/* Follow/Following indicators */}
            {!userData.isFollowing ? (
              <Button
                size="sm"
                onClick={() => handleFollow(userData.id)}
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            ) : (
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
            
            <span className="text-xs text-center mt-1 truncate w-16">
              {userData.username || 'User'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}