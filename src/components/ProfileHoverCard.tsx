import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface ProfileHoverCardProps {
  userId: string;
  children: React.ReactNode;
}

export function ProfileHoverCard({ userId, children }: ProfileHoverCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isFan, setIsFan] = useState(false);
  const [isCrew, setIsCrew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      setProfile(profileData);

      if (user && user.id !== userId) {
        // Check if user follows this profile (is in their crew)
        const { data: crewData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();

        setIsCrew(!!crewData);

        // Check if this profile follows the user (is a fan)
        const { data: fanData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', userId)
          .eq('following_id', user.id)
          .maybeSingle();

        setIsFan(!!fanData);
      }
    };

    fetchProfileData();
  }, [userId, user]);

  const handleFollowToggle = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      if (isCrew) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        setIsCrew(false);
        toast({ description: 'Removed from Crew' });
      } else {
        await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });
        setIsCrew(true);
        toast({ description: 'Added to Crew!' });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = () => {
    navigate(`/chat/${userId}`);
  };

  const handleViewProfile = () => {
    navigate(`/profile/${userId}`);
  };

  if (!profile) return <>{children}</>;

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={profile.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${userId}`} 
              />
              <AvatarFallback>{profile.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-semibold truncate">{profile.username || 'User'}</h4>
                {isFan && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">🌟 Fan</span>}
              </div>
              {profile.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{profile.bio}</p>
              )}
            </div>
          </div>

          {user && user.id !== userId && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isCrew ? "outline" : "default"}
                onClick={handleFollowToggle}
                disabled={isLoading}
                className="flex-1 h-7 text-xs"
              >
                {isCrew ? (
                  <><UserCheck className="h-3 w-3 mr-1" /> Crew</>
                ) : (
                  <><UserPlus className="h-3 w-3 mr-1" /> Add to Crew</>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMessage}
                className="flex-1 h-7 text-xs"
              >
                <MessageCircle className="h-3 w-3 mr-1" /> Message
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewProfile}
            className="w-full h-7 text-xs"
          >
            View Profile
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
