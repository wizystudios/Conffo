
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { hasActiveStory } from '@/services/storyService';
import { StoryRing } from '@/components/story/StoryRing';

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
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStory, setHasStory] = useState(false);
  
  useEffect(() => {
    const fetchUsername = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('Error fetching username:', error);
          return;
        }
        
        setUsername(data?.username || null);
        setAvatarUrl(data?.avatar_url || null);
        
        // If no avatar URL from profile, generate one using DiceBear API
        if (!data?.avatar_url) {
          const avatarSeed = userId || 'anonymous';
          setAvatarUrl(`https://api.dicebear.com/7.x/micah/svg?seed=${avatarSeed}`);
        }
        
        // Check if user has active stories
        if (showStoryIndicator) {
          const userHasStory = await hasActiveStory(userId);
          setHasStory(userHasStory);
        }
      } catch (error) {
        console.error('Error in fetchUsername:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchUsername();
    }
  }, [userId, showStoryIndicator]);

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

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
          <Avatar className={avatarSizeClass[size]}>
            <AvatarFallback className="bg-primary/20">...</AvatarFallback>
          </Avatar>
        )}
        <span className={`${textSizeClass[size]} text-muted-foreground`}>Loading...</span>
      </div>
    );
  }

  const content = (
    <div className="flex items-center gap-2">
      {showAvatar && (
        hasStory && showStoryIndicator ? (
          <StoryRing 
            userId={userId}
            username={username || undefined}
            avatarUrl={avatarUrl}
            size={size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg'}
          />
        ) : (
          <Avatar className={avatarSizeClass[size]}>
            <AvatarImage src={avatarUrl || ''} alt={username || 'User'} />
            <AvatarFallback>{getInitials(username || 'U')}</AvatarFallback>
          </Avatar>
        )
      )}
      <span className={`${textSizeClass[size]} font-medium`}>
        {username || 'Anonymous User'}
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
