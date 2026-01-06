
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Star, Users, MessageCircle, BadgeCheck } from 'lucide-react';
import { ProfileHoverCard } from '@/components/ProfileHoverCard';
import { getCountryFlag } from '@/components/CountrySelector';

interface UsernameDisplayProps {
  userId: string;
  showAvatar?: boolean;
  size?: 'sm' | 'md' | 'lg';
  linkToProfile?: boolean;
  showStoryIndicator?: boolean;
  showRelationshipBadge?: boolean;
  showCountryFlag?: boolean;
}

export function UsernameDisplay({ 
  userId, 
  showAvatar = true, 
  size = 'sm',
  linkToProfile = true,
  showStoryIndicator = true,
  showRelationshipBadge = true,
  showCountryFlag = true
}: UsernameDisplayProps) {
  const { user, isAuthenticated } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFan, setIsFan] = useState(false); // They follow you
  const [isCrew, setIsCrew] = useState(false); // You follow them
  const [hasInteracted, setHasInteracted] = useState(false);
  
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
          .select('username, avatar_url, is_verified, location')
          .eq('id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('UsernameDisplay: Error fetching profile data:', error);
          // Use fallback username
          const fallbackUsername = `user_${userId.slice(0, 8)}`;
          console.log('UsernameDisplay: Using fallback username:', fallbackUsername);
          setUsername(fallbackUsername);
          setAvatarUrl(null);
          setIsVerified(false);
          setCountryCode(null);
        } else if (profileData) {
          // Use profile data
          const displayName = profileData.username || `user_${userId.slice(0, 8)}`;
          console.log('UsernameDisplay: Profile data found, username:', displayName);
          setUsername(displayName);
          setAvatarUrl(profileData.avatar_url);
          setIsVerified(profileData.is_verified || false);
          setCountryCode(profileData.location);
        } else {
          // No profile found, use fallback
          const fallbackUsername = `user_${userId.slice(0, 8)}`;
          console.log('UsernameDisplay: No profile found, using fallback:', fallbackUsername);
          setUsername(fallbackUsername);
          setAvatarUrl(null);
          setIsVerified(false);
          setCountryCode(null);
        }
      } catch (error) {
        console.error('UsernameDisplay: Error in fetchUserData:', error);
        const fallbackUsername = `user_${userId.slice(0, 8)}`;
        setUsername(fallbackUsername);
        setAvatarUrl(null);
        setIsVerified(false);
        setCountryCode(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
    
    // Fetch relationship status
    const fetchRelationship = async () => {
      if (!user?.id || !userId || userId === user.id) return;
      
      try {
        // Check if they follow you (Fan)
        const { data: fanData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', userId)
          .eq('following_id', user.id)
          .maybeSingle();
        
        setIsFan(!!fanData);
        
        // Check if you follow them (Crew)
        const { data: crewData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        
        setIsCrew(!!crewData);
        
        // Check for recent interactions (comments, likes)
        const { data: interactions } = await supabase
          .from('comments')
          .select('id')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);
        
        setHasInteracted(!!interactions && interactions.length > 0);
      } catch (error) {
        console.error('Error fetching relationship:', error);
      }
    };
    
    if (showRelationshipBadge) {
      fetchRelationship();
    }
  }, [userId, user, showRelationshipBadge]);

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

  const countryFlag = getCountryFlag(countryCode);

  const content = (
    <div className="flex items-center gap-2">
      {showAvatar && (
        <div className="relative">
          <Avatar className={avatarSizeClass[size]}>
            <AvatarImage src={avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${userId}`} alt={username} />
            <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          {showCountryFlag && countryFlag && (
            <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">{countryFlag}</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className={`${textSizeClass[size]} font-medium`}>
          {username}
        </span>
        {isVerified && (
          <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20 flex-shrink-0" />
        )}
      </div>
      {showRelationshipBadge && user && userId !== user.id && (
        <div className="flex items-center gap-1">
          {isFan && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
              <Star className="h-2.5 w-2.5 fill-current" />
              <span>Fan</span>
            </Badge>
          )}
          {isCrew && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
              <Users className="h-2.5 w-2.5" />
              <span>Crew</span>
            </Badge>
          )}
          {hasInteracted && !isFan && !isCrew && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              <MessageCircle className="h-2.5 w-2.5" />
              <span>Active</span>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
  
  // Wrap in ProfileHoverCard if authenticated
  const wrappedContent = isAuthenticated ? (
    <ProfileHoverCard userId={userId}>
      {content}
    </ProfileHoverCard>
  ) : content;
  
  // Only show profile links if user is authenticated
  if (linkToProfile && userId && isAuthenticated) {
    return (
      <Link to={`/user/${userId}`} className="hover:opacity-80">
        {wrappedContent}
      </Link>
    );
  }
  
  return wrappedContent;
}
