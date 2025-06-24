
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
  const [username, setUsername] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasStory, setHasStory] = useState(false);
  
  useEffect(() => {
    const fetchUsername = async () => {
      if (!userId) {
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching username:', error);
          setUsername('User');
          setAvatarUrl(`https://api.dicebear.com/7.x/micah/svg?seed=${userId}`);
        } else if (data) {
          setUsername(data.username || 'User');
          setAvatarUrl(data.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${userId}`);
        } else {
          // Create profile if doesn't exist
          const defaultUsername = `user_${userId.slice(0, 8)}`;
          setUsername(defaultUsername);
          setAvatarUrl(`https://api.dicebear.com/7.x/micah/svg?seed=${userId}`);
          
          try {
            await supabase
              .from('profiles')
              .insert({
                id: userId,
                username: defaultUsername,
                updated_at: new Date().toISOString()
              });
          } catch (insertError) {
            console.error('Error creating profile:', insertError);
          }
        }
        
        if (showStoryIndicator) {
          try {
            const userHasStory = await hasActiveStory(userId);
            setHasStory(userHasStory);
          } catch (error) {
            console.error('Error checking stories:', error);
            setHasStory(false);
          }
        }
      } catch (error) {
        console.error('Error in fetchUsername:', error);
        setUsername('User');
        setAvatarUrl(`https://api.dicebear.com/7.x/micah/svg?seed=${userId}`);
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
        {username || 'User'}
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
