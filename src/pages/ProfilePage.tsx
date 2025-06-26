
import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserConfessions } from '@/components/UserConfessions';
import { Button } from '@/components/ui/button';
import { LogOut, Phone, Video } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { FollowButton } from '@/components/FollowButton';
import { SimpleProfileForm } from '@/components/SimpleProfileForm';
import { CallInterface } from '@/components/CallInterface';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');

  useEffect(() => {
    if (userId && user) {
      setIsOwnProfile(userId === user.id);
      setActiveTab(userId === user.id ? 'settings' : 'posts');
    } else if (!userId && user) {
      setIsOwnProfile(true);
      setActiveTab('settings');
    }
  }, [userId, user]);

  useEffect(() => {
    const fetchProfileData = async () => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle();

        if (data) {
          setProfileUser(data);
        }
        
        // Get follow counts
        const [followersResponse, followingResponse] = await Promise.all([
          supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', targetUserId),
          supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', targetUserId)
        ]);
        
        setFollowersCount(followersResponse.count || 0);
        setFollowingCount(followingResponse.count || 0);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfileData();
  }, [userId, user]);

  const handleCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setShowCallInterface(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }
  
  if (!isAuthenticated && isOwnProfile && !userId) {
    return <Navigate to="/auth" />;
  }

  const displayUser = profileUser || user;
  const username = displayUser?.username || displayUser?.email?.split('@')[0] || 'User';
  const avatarUrl = displayUser?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${displayUser?.id}`;

  return (
    <Layout>
      <div className="w-full">
        {/* Profile Header */}
        <div className="w-full bg-background border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={avatarUrl} alt={username} />
                  <AvatarFallback className="text-xl">
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{username}</h2>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <div className="text-center">
                      <p className="font-medium">{followersCount}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="font-medium">{followingCount}</p>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {!isOwnProfile && isAuthenticated && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FollowButton userId={userId!} />
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => handleCall('audio')}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleCall('video')}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="max-w-lg mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-background border-b border-border rounded-none">
              {isOwnProfile ? (
                <>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </>
              )}
            </TabsList>
            
            {isOwnProfile ? (
              <>
                <TabsContent value="settings" className="p-4">
                  <div className="space-y-4">
                    <SimpleProfileForm />
                    
                    <div className="pt-4 border-t border-border">
                      <Button variant="destructive" onClick={logout} className="w-full">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="posts">
                  <UserConfessions />
                </TabsContent>
              </>
            ) : (
              <>
                <TabsContent value="posts">
                  <UserConfessions userId={userId} />
                </TabsContent>
                
                <TabsContent value="info">
                  <div className="text-center py-12 mx-4">
                    <p className="text-muted-foreground">User info</p>
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
        
        <CallInterface
          isOpen={showCallInterface}
          onClose={() => setShowCallInterface(false)}
          callType={callType}
          targetUserId={userId || ''}
          targetUsername={username}
          targetAvatarUrl={avatarUrl}
        />
      </div>
    </Layout>
  );
}
