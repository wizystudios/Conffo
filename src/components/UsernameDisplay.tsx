
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface UsernameDisplayProps {
  userId: string;
  showAvatar?: boolean;
  size?: 'sm' | 'md' | 'lg';
  linkToProfile?: boolean;
  showStoryIndicator?: boolean;
}

export function UsernameDisplay({ 
  userId, 
  showAvatar = true, 
  size = 'sm',
  linkToProfile = true,
  showStoryIndicator = true
}: UsernameDisplayProps) {
  const { user, isAuthenticated } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        console.log('UsernameDisplay: No userId provided');
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('UsernameDisplay: Fetching user data for userId:', userId);
        
        // Fetch from profiles table
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('UsernameDisplay: Error fetching profile data:', error);
          // Use fallback username
          const fallbackUsername = `user_${userId.slice(0, 8)}`;
          console.log('UsernameDisplay: Using fallback username:', fallbackUsername);
          setUsername(fallbackUsername);
          setAvatarUrl(null);
        } else if (profileData) {
          // Use profile data
          const displayName = profileData.username || `user_${userId.slice(0, 8)}`;
          console.log('UsernameDisplay: Profile data found, username:', displayName);
          setUsername(displayName);
          setAvatarUrl(profileData.avatar_url);
        } else {
          // No profile found, use fallback
          const fallbackUsername = `user_${userId.slice(0, 8)}`;
          console.log('UsernameDisplay: No profile found, using fallback:', fallbackUsername);
          setUsername(fallbackUsername);
          setAvatarUrl(null);
        }
      } catch (error) {
        console.error('UsernameDisplay: Error in fetchUserData:', error);
        const fallbackUsername = `user_${userId.slice(0, 8)}`;
        setUsername(fallbackUsername);
        setAvatarUrl(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId, user]);

  const avatarSizeClass = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };
  
  const textSizeClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        {showAvatar && (
          <div className={`${avatarSizeClass[size]} bg-muted rounded-full animate-pulse`} />
        )}
        <div className={`${textSizeClass[size]} bg-muted rounded h-4 w-16 animate-pulse`} />
      </div>
    );
  }

  const content = (
    <div className="flex items-center gap-2">
      {showAvatar && (
        <Avatar className={avatarSizeClass[size]}>
          <AvatarImage src={avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${userId}`} alt={username} />
          <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <span className={`${textSizeClass[size]} font-medium`}>
        {username}
      </span>
    </div>
  );
  
  // Only show profile links if user is authenticated
  if (linkToProfile && userId && isAuthenticated) {
    return (
      <Link to={`/user/${userId}`} className="hover:opacity-80">
        {content}
      </Link>
    );
  }
  
  return content;
}
