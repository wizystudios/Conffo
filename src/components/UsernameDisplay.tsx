
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface UsernameDisplayProps {
  userId: string;
  showAvatar?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function UsernameDisplay({ userId, showAvatar = true, size = 'sm' }: UsernameDisplayProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUsername = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Fixed the infinite recursion by using direct database query
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
      } catch (error) {
        console.error('Error in fetchUsername:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchUsername();
    }
  }, [userId]);

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'A';
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
  
  return (
    <div className="flex items-center gap-2">
      {showAvatar && (
        <Avatar className={avatarSizeClass[size]}>
          <AvatarImage src={avatarUrl || ''} alt={username || 'User'} />
          <AvatarFallback className="bg-primary/20">{getInitials(username || 'A')}</AvatarFallback>
        </Avatar>
      )}
      <span className={`${textSizeClass[size]} font-medium`}>
        {username || 'Anonymous User'}
      </span>
    </div>
  );
}
