
import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserConfessions } from '@/components/UserConfessions';
import { UserSavedPosts } from '@/components/UserSavedPosts';
import { UserLikedPosts } from '@/components/UserLikedPosts';
import { Button } from '@/components/ui/button';
import { LogOut, Phone, Video } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { FollowButton } from '@/components/FollowButton';
import { SimpleProfileForm } from '@/components/SimpleProfileForm';
import { CallInterface } from '@/components/CallInterface';
import { FullScreenFollowersModal } from '@/components/FullScreenFollowersModal';
import { AvatarCustomization } from '@/components/AvatarCustomization';
import { EnhancedProfileSettings } from '@/components/EnhancedProfileSettings';
import { RealImageVerification } from '@/components/RealImageVerification';
import { ProfileInfoSection } from '@/components/ProfileInfoSection';

interface ProfileData {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_public: boolean;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');

  // Determine if this is the user's own profile
  useEffect(() => {
    if (!user) return;
    
    const ownProfile = !userId || userId === user.id;
    setIsOwnProfile(ownProfile);
    setActiveTab('posts'); // Always start with posts tab
  }, [userId, user]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      setIsLoadingProfile(true);
      const targetUserId = userId || user.id;
      
      try {
        console.log('Fetching profile for user:', targetUserId);
        
        // Get profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, contact_email, contact_phone, is_public')
          .eq('id', targetUserId)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        // Set profile data or create fallback
        if (profile) {
          setProfileData({
            id: profile.id,
            username: profile.username || user.email?.split('@')[0] || 'User',
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            contact_email: profile.contact_email,
            contact_phone: profile.contact_phone,
            is_public: profile.is_public ?? true
          });
        } else {
          // Create fallback profile data
          const fallbackProfile: ProfileData = {
            id: targetUserId,
            username: user.email?.split('@')[0] || 'User',
            avatar_url: null,
            bio: null,
            contact_email: null,
            contact_phone: null,
            is_public: true
          };
          setProfileData(fallbackProfile);
        }
        
        // Get follow counts
        try {
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
        } catch (followError) {
          console.error('Error fetching follow counts:', followError);
          setFollowersCount(0);
          setFollowingCount(0);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        // Set fallback data on error
        setProfileData({
          id: targetUserId,
          username: `user_${targetUserId.slice(0, 8)}`,
          avatar_url: null,
          bio: null,
          contact_email: null,
          contact_phone: null,
          is_public: true
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, [userId, user]);

  const handleCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setShowCallInterface(true);
  };

  const handleFollowChange = () => {
    // Refresh follow counts when follow status changes
    if (userId) {
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
        .then(({ count }) => setFollowersCount(count || 0));
    }
  };

  const handleProfileUpdate = () => {
    console.log('Profile update triggered, refreshing data...');
    // Refresh profile data after update
    if (userId || user?.id) {
      const targetUserId = userId || user!.id;
      supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, contact_email, contact_phone, is_public')
        .eq('id', targetUserId)
        .maybeSingle()
        .then(({ data: updatedProfile, error }) => {
          if (error) {
            console.error('Error refreshing profile:', error);
            return;
          }
          
          if (updatedProfile) {
            console.log('Profile data refreshed:', updatedProfile);
            setProfileData({
              id: updatedProfile.id,
              username: updatedProfile.username || 'User',
              avatar_url: updatedProfile.avatar_url,
              bio: updatedProfile.bio,
              contact_email: updatedProfile.contact_email,
              contact_phone: updatedProfile.contact_phone,
              is_public: updatedProfile.is_public ?? true
            });
          }
        });
    }
  };

  const handleFollowersClick = () => {
    setFollowersModalTab('followers');
    setShowFollowersModal(true);
  };

  const handleFollowingClick = () => {
    setFollowersModalTab('following');
    setShowFollowersModal(true);
  };

  if (isLoading || isLoadingProfile) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }
  
  if (!isAuthenticated && !userId) {
    return <Navigate to="/auth" />;
  }

  if (!profileData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </Layout>
    );
  }

  const username = profileData.username || 'User';
  const avatarUrl = profileData.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${profileData.id}`;

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
                  
                  <div className="flex items-center gap-6 mt-2">
                    <button 
                      className="flex items-center gap-2 hover:opacity-80 cursor-pointer"
                      onClick={handleFollowersClick}
                    >
                      <span className="font-semibold">{followersCount}</span>
                      <span className="text-sm text-muted-foreground">Followers</span>
                    </button>
                    
                    <button 
                      className="flex items-center gap-2 hover:opacity-80 cursor-pointer"
                      onClick={handleFollowingClick}
                    >
                      <span className="font-semibold">{followingCount}</span>
                      <span className="text-sm text-muted-foreground">Following</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {!isOwnProfile && isAuthenticated && userId && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FollowButton userId={userId} onFollowChange={handleFollowChange} />
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
            <TabsList className="grid w-full grid-cols-5 bg-background border-b border-border rounded-none">
              {isOwnProfile ? (
                <>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="avatar">Avatar</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  <TabsTrigger value="verify">Verify</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="saved">Saved</TabsTrigger>
                  <TabsTrigger value="liked">Liked</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </>
              )}
            </TabsList>
            
            {isOwnProfile ? (
              <>
                <TabsContent value="posts">
                  <UserConfessions userId={user?.id} />
                </TabsContent>

                <TabsContent value="settings" className="p-4">
                  <div className="space-y-4">
                    <SimpleProfileForm />
                    
                    {/* App Information Section */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="font-semibold mb-4">App Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-center space-x-2 p-3 bg-muted/50 rounded-lg">
                          <img 
                            src="/lovable-uploads/911a3176-bd7a-4c2f-8145-9fb902754993.png" 
                            alt="Conffo" 
                            className="h-8 w-8 object-contain"
                          />
                          <span className="font-medium">Conffo</span>
                          <span className="text-sm text-muted-foreground">created by</span>
                          <div className="flex items-center">
                            <img 
                              src="/lovable-uploads/5affd7c4-65bb-4b3a-af86-0cf0b47b138f.png" 
                              alt="KN Technology" 
                              className="h-6 w-6 rounded-full object-cover mr-1"
                            />
                            <span className="font-medium">KN Technology</span>
                          </div>
                        </div>
                        
                        <div className="text-center text-sm text-muted-foreground">
                          © {new Date().getFullYear()} Conffo
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <Button variant="outline" asChild className="justify-start">
                            <a href="/terms" target="_blank" rel="noopener noreferrer">
                              Terms & Conditions
                            </a>
                          </Button>
                          <Button variant="outline" asChild className="justify-start">
                            <a href="/privacy" target="_blank" rel="noopener noreferrer">
                              Privacy Policy
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-border">
                      <Button variant="destructive" onClick={logout} className="w-full">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="avatar" className="p-4">
                  <AvatarCustomization onAvatarUpdate={handleProfileUpdate} />
                </TabsContent>

                <TabsContent value="advanced" className="p-4">
                  <EnhancedProfileSettings />
                </TabsContent>

                <TabsContent value="verify" className="p-4">
                  <RealImageVerification />
                </TabsContent>
              </>
            ) : (
              <>
                <TabsContent value="posts">
                  <UserConfessions userId={userId} />
                </TabsContent>
                
                <TabsContent value="saved">
                  <UserSavedPosts userId={userId} />
                </TabsContent>
                
                <TabsContent value="liked">
                  <UserLikedPosts userId={userId} />
                </TabsContent>
                
                <TabsContent value="info">
                  <ProfileInfoSection userId={userId!} isOwnProfile={false} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
        
        {userId && (
          <>
            <CallInterface
              isOpen={showCallInterface}
              onClose={() => setShowCallInterface(false)}
              callType={callType}
              targetUserId={userId}
              targetUsername={username}
              targetAvatarUrl={avatarUrl}
            />
            
            <FullScreenFollowersModal
              isOpen={showFollowersModal}
              onClose={() => setShowFollowersModal(false)}
              userId={userId}
              initialTab={followersModalTab}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
