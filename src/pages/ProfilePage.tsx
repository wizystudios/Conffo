import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { UserConfessions } from '@/components/UserConfessions';
import { Button } from '@/components/ui/button';
import { Settings, BadgeCheck, ChevronLeft, Users } from 'lucide-react';
import { Navigate, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { FollowButton } from '@/components/FollowButton';
import { FullScreenFollowersModal } from '@/components/FullScreenFollowersModal';
import { getCountryFlag } from '@/components/CountrySelector';
import { EnhancedProfileSettings } from '@/components/EnhancedProfileSettings';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface ProfileData {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
  location: string | null;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('confessions');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');
  const [showSettings, setShowSettings] = useState(false);

  // Check if settings should be open from URL param
  useEffect(() => {
    if (searchParams.get('tab') === 'settings') {
      setShowSettings(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const ownProfile = !userId || userId === user.id;
    setIsOwnProfile(ownProfile);
  }, [userId, user]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      setIsLoadingProfile(true);
      const targetUserId = userId || user.id;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, is_verified, location')
          .eq('id', targetUserId)
          .maybeSingle();

        if (profile) {
          setProfileData({
            id: profile.id,
            username: profile.username || user.email?.split('@')[0] || 'User',
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            is_verified: profile.is_verified,
            location: profile.location
          });
        } else {
          setProfileData({
            id: targetUserId,
            username: user.email?.split('@')[0] || 'User',
            avatar_url: null,
            bio: null,
            is_verified: null,
            location: null
          });
        }
        
        const [followersResponse, followingResponse, postsResponse] = await Promise.all([
          supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
          supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
          supabase.from('confessions').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId)
        ]);
        
        setFollowersCount(followersResponse.count || 0);
        setFollowingCount(followingResponse.count || 0);
        setPostsCount(postsResponse.count || 0);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, [userId, user]);

  const handleFollowChange = () => {
    if (userId) {
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
        .then(({ count }) => setFollowersCount(count || 0));
    }
  };

  if (isLoading || isLoadingProfile) {
    return (
      <Layout>
        <div className="w-full max-w-2xl mx-auto">
          <div className="px-4 py-6">
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="h-24 w-24 rounded-full bg-muted" />
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted rounded" />
            </div>
          </div>
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

  const username = profileData.username || 'Anonymous';
  const avatarUrl = profileData.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${profileData.id}`;
  const countryFlag = getCountryFlag(profileData.location);

  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto pb-24">
        {/* Header - No container, free design */}
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg">My Profile</h1>
          {isOwnProfile && (
            <button onClick={() => setShowSettings(true)} className="p-2 -mr-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Profile Info - Free from container */}
        <div className="px-4 py-6 flex flex-col items-center">
          {/* Avatar */}
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 p-1">
              <Avatar className="h-full w-full border-2 border-background">
                <AvatarImage src={avatarUrl} alt={username} />
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-accent/20">
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            {countryFlag && (
              <span className="absolute -bottom-1 -right-1 text-2xl">{countryFlag}</span>
            )}
            {profileData.is_verified && (
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                <BadgeCheck className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
          
          {/* Username & Bio */}
          <h2 className="text-xl font-bold mt-4">{username}</h2>
          {profileData.bio && (
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
              {profileData.bio}
            </p>
          )}

          {/* Edit Profile Button - Now opens settings sheet */}
          {isOwnProfile && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(true)}
              className="mt-4 rounded-full px-6"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}

          {/* Action Buttons for other users */}
          {!isOwnProfile && isAuthenticated && userId && (
            <div className="flex gap-3 mt-4">
              <FollowButton userId={userId} onFollowChange={handleFollowChange} />
              <Button 
                variant="outline"
                onClick={() => navigate(`/chat/${userId}`)}
                className="rounded-full px-4"
              >
                Message
              </Button>
            </div>
          )}
          
          {/* Stats Row - Free design, no container */}
          <div className="flex items-center justify-center gap-8 mt-6 w-full">
            <button className="flex flex-col items-center">
              <span className="text-2xl font-bold">{postsCount}</span>
              <span className="text-xs text-muted-foreground">Confessions</span>
            </button>
            
            <button 
              className="flex flex-col items-center"
              onClick={() => {
                setFollowersModalTab('followers');
                setShowFollowersModal(true);
              }}
            >
              <span className="text-2xl font-bold">{followersCount}</span>
              <span className="text-xs text-muted-foreground">Fans</span>
            </button>
            
            <button 
              className="flex flex-col items-center"
              onClick={() => {
                setFollowersModalTab('following');
                setShowFollowersModal(true);
              }}
            >
              <span className="text-2xl font-bold">{followingCount}</span>
              <span className="text-xs text-muted-foreground">Crew</span>
            </button>
          </div>
        </div>

        {/* Tabs - Confessions, Fans, Crew */}
        <div className="px-4">
          <div className="flex gap-1 p-1 bg-muted/30 rounded-full">
            {['confessions', 'fans', 'crew'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section - No form containers */}
        <div className="px-4 mt-4">
          {activeTab === 'confessions' && (
            <UserConfessions userId={profileData.id} />
          )}
          {activeTab === 'fans' && (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Your fans will appear here</p>
              <Button 
                variant="outline"
                onClick={() => {
                  setFollowersModalTab('followers');
                  setShowFollowersModal(true);
                }}
              >
                View All Fans
              </Button>
            </div>
          )}
          {activeTab === 'crew' && (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Your crew will appear here</p>
              <Button 
                variant="outline"
                onClick={() => {
                  setFollowersModalTab('following');
                  setShowFollowersModal(true);
                }}
              >
                View All Crew
              </Button>
            </div>
          )}
        </div>
        
        <FullScreenFollowersModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          userId={userId || user?.id || ''}
          initialTab={followersModalTab}
        />

        {/* Settings Sheet */}
        <Sheet open={showSettings} onOpenChange={setShowSettings}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
            <EnhancedProfileSettings onClose={() => setShowSettings(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
