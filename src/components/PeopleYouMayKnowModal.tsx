import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { FollowButton } from '@/components/FollowButton';

interface SuggestedUser {
  id: string;
  username: string;
  avatar_url: string | null;
  mutualFollowers?: number;
}

interface PeopleYouMayKnowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PeopleYouMayKnowModal({ isOpen, onClose }: PeopleYouMayKnowModalProps) {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      if (!user) return;

      try {
        // Get users that the current user is NOT following
        const { data: followingData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];
        
        // Get random users excluding current user and already followed users
        const { data: usersData, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', user.id)
          .not('id', 'in', followingIds.length > 0 ? `(${followingIds.join(',')})` : '()')
          .limit(20);

        if (error) throw error;

        const users = (usersData || []).map(user => ({
          ...user,
          username: user.username || 'Anonymous User',
          mutualFollowers: Math.floor(Math.random() * 5) // Simulate mutual followers
        }));

        setSuggestedUsers(users);
      } catch (error) {
        console.error('Error fetching suggested users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchSuggestedUsers();
    }
  }, [user, isOpen]);

  const handleHideUser = (userId: string) => {
    setHiddenUsers(prev => new Set([...prev, userId]));
  };

  const visibleUsers = suggestedUsers.filter(user => !hiddenUsers.has(user.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h1 className="text-xl font-semibold">People You May Know</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-20 w-20 bg-muted rounded-full" />
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-8 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {visibleUsers.map((suggestedUser) => (
              <div
                key={suggestedUser.id}
                className="relative border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => window.open(`/profile?userId=${suggestedUser.id}`, '_self')}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHideUser(suggestedUser.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
                
                <div className="flex flex-col items-center space-y-3">
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={suggestedUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${suggestedUser.id}`} 
                      alt={suggestedUser.username} 
                    />
                    <AvatarFallback>
                      {suggestedUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="text-center">
                    <p className="font-medium text-sm truncate max-w-[120px]">
                      {suggestedUser.username}
                    </p>
                    {suggestedUser.mutualFollowers && suggestedUser.mutualFollowers > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {suggestedUser.mutualFollowers} mutual
                      </p>
                    )}
                  </div>
                  
                  <div onClick={(e) => e.stopPropagation()}>
                    <FollowButton 
                      userId={suggestedUser.id} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}