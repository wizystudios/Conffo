import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, UserPlus } from 'lucide-react';
import { FollowButton } from '@/components/FollowButton';

interface FullScreenFollowersModalProps {
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

export function FullScreenFollowersModal({ isOpen, onClose, userId, initialTab = 'followers' }: FullScreenFollowersModalProps) {
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
      // Fetch followers with profile data
      const { data: followersData, error: followersError } = await supabase
        .from('user_follows')
        .select(`
          follower_id,
          follower:follower_id (
            id,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', userId);

      if (followersError) {
        console.error('Followers error:', followersError);
      }

      // Fetch following with profile data
      const { data: followingData, error: followingError } = await supabase
        .from('user_follows')
        .select(`
          following_id,
          following:following_id (
            id,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('follower_id', userId);

      if (followingError) {
        console.error('Following error:', followingError);
      }

      // Process followers
      const followersList = (followersData || [])
        .map((item: any) => item.follower || { id: item.follower_id, username: `user_${item.follower_id.slice(0, 8)}`, avatar_url: null })
        .filter((profile: any) => profile && profile.id);

      // Process following
      const followingList = (followingData || [])
        .map((item: any) => item.following || { id: item.following_id, username: `user_${item.following_id.slice(0, 8)}`, avatar_url: null })
        .filter((profile: any) => profile && profile.id);

      setFollowers(followersList);
      setFollowing(followingList);
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

  const renderUserList = (users: FollowData[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-muted/20 rounded-full p-4 mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {users.map((userData) => (
          <div key={userData.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors rounded-lg">
            <UsernameDisplay 
              userId={userData.id}
              showAvatar={true}
              size="md"
              linkToProfile={isAuthenticated}
            />
            {isAuthenticated && userData.id !== user?.id && (
              <FollowButton 
                userId={userData.id} 
                onFollowChange={() => fetchFollowData()}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-full w-full max-w-none max-h-none rounded-none p-0 gap-0 overflow-hidden">
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">Connections</h2>
            <div className="w-9" /> {/* Spacer for center alignment */}
          </div>

          {/* Tabs */}
          <div className="border-b border-border bg-background">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-transparent rounded-none border-none">
                <TabsTrigger 
                  value="followers" 
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{followers.length}</span>
                  <span className="text-sm text-muted-foreground">Fans</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="following" 
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="font-medium">{following.length}</span>
                  <span className="text-sm text-muted-foreground">Crew</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Content */}
              <div className="h-full overflow-auto">
                <TabsContent value="followers" className="mt-0 h-full">
                  <div className="px-2 py-2">
                    {renderUserList(followers, "No fans yet")}
                  </div>
                </TabsContent>
                
                <TabsContent value="following" className="mt-0 h-full">
                  <div className="px-2 py-2">
                    {renderUserList(following, "No crew members yet")}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}