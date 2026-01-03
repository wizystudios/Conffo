import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, UserPlus, Search, Ban } from 'lucide-react';
import { FollowButton } from '@/components/FollowButton';
import { getBlockedUsers, getBlockedByUsers } from '@/services/blockService';

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
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      fetchFollowData();
      fetchBlockedUsers();
    }
  }, [isOpen, userId]);

  const fetchBlockedUsers = async () => {
    try {
      const [blocked, blockedBy] = await Promise.all([
        getBlockedUsers(),
        getBlockedByUsers()
      ]);
      const allBlockedIds = new Set([
        ...blocked.map(b => b.blocked_id),
        ...blockedBy.map(b => b.blocker_id)
      ]);
      setBlockedIds(allBlockedIds);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  const fetchFollowData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Get followers - users who follow this user
      const { data: followersData, error: followersError } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (followersError) {
        console.error('Followers error:', followersError);
      }

      // Get following - users this user follows
      const { data: followingData, error: followingError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingError) {
        console.error('Following error:', followingError);
      }

      // Fetch profiles for followers
      const followerIds = (followersData || []).map(f => f.follower_id);
      const followingIds = (followingData || []).map(f => f.following_id);

      let followersList: FollowData[] = [];
      let followingList: FollowData[] = [];

      if (followerIds.length > 0) {
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', followerIds);
        
        followersList = (followerProfiles || []).map(p => ({
          id: p.id,
          username: p.username || `user_${p.id.slice(0, 8)}`,
          avatar_url: p.avatar_url
        }));
      }

      if (followingIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', followingIds);
        
        followingList = (followingProfiles || []).map(p => ({
          id: p.id,
          username: p.username || `user_${p.id.slice(0, 8)}`,
          avatar_url: p.avatar_url
        }));
      }

      setFollowers(followersList);
      setFollowing(followingList);
    } catch (error) {
      console.error('Error fetching follow data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out blocked users and apply search
  const filterUsers = (users: FollowData[]) => {
    return users
      .filter(u => !blockedIds.has(u.id))
      .filter(u => 
        !searchQuery || 
        u.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
  };

  const filteredFollowers = filterUsers(followers);
  const filteredFollowing = filterUsers(following);

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
          <div key={userData.id} className="flex items-center justify-between p-3 hover:bg-muted/20 transition-colors rounded-lg">
            <UsernameDisplay 
              userId={userData.id}
              showAvatar={true}
              size="sm"
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

          {/* Search Bar */}
          <div className="p-3 border-b border-border bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 h-11 bg-transparent rounded-none border-b border-border">
                <TabsTrigger 
                  value="followers" 
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{filteredFollowers.length}</span>
                  <span className="text-xs text-muted-foreground">Fans</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="following" 
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="font-medium">{filteredFollowing.length}</span>
                  <span className="text-xs text-muted-foreground">Crew</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-auto">
                <TabsContent value="followers" className="mt-0 h-full">
                  <div className="px-2 py-2">
                    {renderUserList(filteredFollowers, searchQuery ? "No matching fans" : "No fans yet")}
                  </div>
                </TabsContent>
                
                <TabsContent value="following" className="mt-0 h-full">
                  <div className="px-2 py-2">
                    {renderUserList(filteredFollowing, searchQuery ? "No matching crew" : "No crew members yet")}
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