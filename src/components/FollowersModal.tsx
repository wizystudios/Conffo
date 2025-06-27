import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: 'followers' | 'following';
}

interface FollowData {
  id: string;
  username: string;
  avatar_url: string | null;
}

export function FollowersModal({ isOpen, onClose, userId, initialTab = 'followers' }: FollowersModalProps) {
  const { user, isAuthenticated } = useAuth();
  const [followers, setFollowers] = useState<FollowData[]>([]);
  const [following, setFollowing] = useState<FollowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen && userId) {
      fetchFollowData();
    }
  }, [isOpen, userId]);

  const fetchFollowData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch followers
      const { data: followersData, error: followersError } = await supabase
        .from('user_follows')
        .select(`
          follower_id,
          profiles!user_follows_follower_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('following_id', userId);

      if (followersError) {
        console.error('Error fetching followers:', followersError);
      }

      // Fetch following
      const { data: followingData, error: followingError } = await supabase
        .from('user_follows')
        .select(`
          following_id,
          profiles!user_follows_following_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('follower_id', userId);

      if (followingError) {
        console.error('Error fetching following:', followingError);
      }

      // Process followers data
      const processedFollowers = followersData?.map(item => ({
        id: item.follower_id,
        username: (item.profiles as any)?.username || `user_${item.follower_id.slice(0, 8)}`,
        avatar_url: (item.profiles as any)?.avatar_url || null
      })) || [];

      // Process following data
      const processedFollowing = followingData?.map(item => ({
        id: item.following_id,
        username: (item.profiles as any)?.username || `user_${item.following_id.slice(0, 8)}`,
        avatar_url: (item.profiles as any)?.avatar_url || null
      })) || [];

      setFollowers(processedFollowers);
      setFollowing(processedFollowing);
    } catch (error) {
      console.error('Error fetching follow data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === 'followers' || value === 'following') {
      setActiveTab(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({following.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers" className="mt-4">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : followers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No followers yet</p>
              ) : (
                followers.map((follower) => (
                  <div key={follower.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                    <UsernameDisplay 
                      userId={follower.id}
                      showAvatar={true}
                      size="md"
                      linkToProfile={isAuthenticated}
                    />
                    {isAuthenticated && follower.id !== user?.id && (
                      <Button variant="outline" size="sm" onClick={onClose}>
                        View Profile
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="following" className="mt-4">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : following.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Not following anyone yet</p>
              ) : (
                following.map((followedUser) => (
                  <div key={followedUser.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                    <UsernameDisplay 
                      userId={followedUser.id}
                      showAvatar={true}
                      size="md"
                      linkToProfile={isAuthenticated}
                    />
                    {isAuthenticated && followedUser.id !== user?.id && (
                      <Button variant="outline" size="sm" onClick={onClose}>
                        View Profile
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
