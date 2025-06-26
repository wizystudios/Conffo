
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
  const { user } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      try {
        // If this is the current user, use their data from context
        if (user && userId === user.id) {
          setUsername(user.username || user.email?.split('@')[0] || 'User');
          setAvatarUrl(user.avatarUrl || null);
          setIsLoading(false);
          return;
        }
        
        // For other users, try to fetch from profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .maybeSingle();
        
        if (profileData?.username) {
          setUsername(profileData.username);
          setAvatarUrl(profileData.avatar_url);
        } else {
          // Fallback to a simple username
          setUsername(`user_${userId.slice(0, 8)}`);
          setAvatarUrl(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUsername(`user_${userId.slice(0, 8)}`);
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
  
  if (linkToProfile && userId) {
    return (
      <Link to={`/user/${userId}`} className="hover:opacity-80">
        {content}
      </Link>
    );
  }
  
  return content;
}
