import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  // Plus button opens New Confession page
  const handleCreateConfession = () => {
    navigate('/create-post');
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
        description: "✅ Following user!",
      });
    } catch (error) {
      console.error('Error following user:', error);
      toast({
        variant: "destructive",
        description: "❌ Failed to follow user"
      });
    }
  };

  if (!isAuthenticated || isLoading) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-border/50">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
        {/* Current User - Unique Conffo card style */}
        {currentUserProfile && (
          <div className="flex-shrink-0 relative group">
            <Link to={`/user/${currentUserProfile.id}`} className="block">
              <div className="relative conffo-ripple">
                {currentUserProfile.hasStory ? (
                  <StoryRing
                    userId={currentUserProfile.id}
                    username={currentUserProfile.username}
                    avatarUrl={currentUserProfile.avatar_url}
                    size="md"
                  />
                ) : (
                  <Avatar className="h-14 w-14 ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                    <AvatarImage 
                      src={currentUserProfile.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${currentUserProfile.id}`} 
                      alt={currentUserProfile.username || 'You'}
                      loading="lazy"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {currentUserProfile.username?.charAt(0).toUpperCase() || 'Y'}
                    </AvatarFallback>
                  </Avatar>
                )}
                {/* Unique create badge - diamond shape */}
                <button
                  onClick={(e) => { e.preventDefault(); handleCreateConfession(); }}
                  className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                  style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </Link>
            <span className="block text-[10px] text-center mt-2 text-muted-foreground font-medium truncate max-w-14">
              You
            </span>
          </div>
        )}

        {/* Unique vertical divider with gradient */}
        <div className="h-14 w-px flex-shrink-0 bg-gradient-to-b from-transparent via-border to-transparent" />

        {/* Other Users - Conffo unique horizontal cards */}
        {users.map((userData) => (
          <div key={userData.id} className="flex-shrink-0 group">
            <div className="relative conffo-ripple">
              {userData.hasStory ? (
                <StoryRing
                  userId={userData.id}
                  username={userData.username}
                  avatarUrl={userData.avatar_url}
                  size="md"
                />
              ) : (
                <Link to={`/user/${userData.id}`}>
                  <Avatar className={`h-12 w-12 transition-all ${
                    userData.isFollowing 
                      ? 'ring-2 ring-green-500/30' 
                      : 'ring-1 ring-muted/30 hover:ring-primary/40'
                  }`}>
                    <AvatarImage 
                      src={userData.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${userData.id}`} 
                      alt={userData.username || 'User'}
                      loading="lazy"
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                      {userData.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              )}
              
              {/* Connect button - Conffo unique pill style at bottom */}
              {!userData.isFollowing && (
                <button
                  onClick={() => handleFollow(userData.id)}
                  className="conffo-btn-connect absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap"
                >
                  Connect
                </button>
              )}
              
              {/* Connected indicator - Conffo unique checkmark badge */}
              {userData.isFollowing && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-green-600" />
                </div>
              )}
            </div>
            <span className="block text-[10px] text-center mt-2 text-muted-foreground truncate max-w-12">
              {userData.username?.split(' ')[0] || 'User'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
