import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfessionCard } from '@/components/ConfessionCard';
import { UserConfessions } from '@/components/UserConfessions';
import { getConfessionById } from '@/services/supabaseDataService';
import { Confession } from '@/types';
import { AlertCircle, User, Save, Download, LogOut, Upload, Camera, UserPlus, Users, UserMinus, Eye, EyeOff, Settings, Phone, Video } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase, checkIfFollowing, getFollowersCount, getFollowingCount, addFollow, removeFollow } from '@/integrations/supabase/client';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { Switch } from '@/components/ui/switch';
import { CallInterface } from '@/components/CallInterface';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, isAuthenticated, isLoading, updateUsername, updateUserProfile, logout, getSavedConfessions } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savedConfessions, setSavedConfessions] = useState<Confession[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');

  // Determine if viewing own profile or someone else's
  useEffect(() => {
    if (userId && user) {
      setIsOwnProfile(userId === user.id);
      setActiveTab(isOwnProfile ? 'settings' : 'posts');
    } else if (!userId && user) {
      setIsOwnProfile(true);
      setActiveTab('settings');
    } else {
      setIsOwnProfile(false);
      setActiveTab('posts');
    }
  }, [userId, user]);

  // Load profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        if (data) {
          setProfileUser(data);
          
          if (isOwnProfile) {
            setUsername(data.username || '');
            setBio(data.bio || '');
            setEmail(data.contact_email || '');
            setPhone(data.contact_phone || '');
            setIsProfilePublic(data.is_public !== false);
          } else {
            setUsername(data.username || 'User');
            setBio(data.bio || 'No bio available');
            if (data.is_public === false && !isAuthenticated) {
              setBio('This profile is private');
            }
          }
          
          setAvatarUrl(data.avatar_url || null);
        } else {
          // If no profile exists, create a basic one
          if (isOwnProfile && user?.id) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                username: user.email?.split('@')[0] || 'User',
                updated_at: new Date().toISOString()
              });
            
            if (insertError) {
              console.error('Error creating profile:', insertError);
            } else {
              setUsername(user.email?.split('@')[0] || 'User');
            }
          }
        }
        
        // Check if the current user is following this profile
        if (user && !isOwnProfile) {
          try {
            const isFollowingResult = await checkIfFollowing(user.id, targetUserId);
            setIsFollowing(isFollowingResult);
          } catch (error) {
            console.error('Error checking follow status:', error);
            setIsFollowing(false);
          }
        }
        
        // Get followers count
        try {
          const followersCountResult = await getFollowersCount(targetUserId);
          setFollowersCount(followersCountResult);
        } catch (error) {
          console.error('Error getting followers count:', error);
          setFollowersCount(0);
        }
        
        // Get following count
        try {
          const followingCountResult = await getFollowingCount(targetUserId);
          setFollowingCount(followingCountResult);
        } catch (error) {
          console.error('Error getting following count:', error);
          setFollowingCount(0);
        }
        
      } catch (error) {
        console.error('Error in fetchProfileData:', error);
      }
    };

    fetchProfileData();
  }, [userId, user, isOwnProfile, isAuthenticated]);

  // Load saved confessions
  useEffect(() => {
    const fetchSavedConfessions = async () => {
      if (!isAuthenticated || !isOwnProfile) return;
      
      try {
        const savedIds = await getSavedConfessions();
        const confessions: Confession[] = [];
        
        for (const id of savedIds) {
          try {
            const confession = await getConfessionById(id, user?.id);
            if (confession) {
              confessions.push(confession);
            }
          } catch (error) {
            console.error(`Error fetching confession ${id}:`, error);
          }
        }
        
        setSavedConfessions(confessions);
      } catch (error) {
        console.error('Error fetching saved confessions:', error);
      }
    };
    
    fetchSavedConfessions();
  }, [isAuthenticated, user?.id, getSavedConfessions, isOwnProfile]);

  const handleCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setShowCallInterface(true);
  };

  const handleToggleFollow = async () => {
    if (!user || !userId || isOwnProfile) return;
    
    try {
      if (isFollowing) {
        // Unfollow
        await removeFollow(user.id, userId);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        // Follow
        await addFollow(user.id, userId);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleToggleProfilePrivacy = async () => {
    if (!isOwnProfile || !user) return;
    
    try {
      const newPrivacyValue = !isProfilePublic;
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_public: newPrivacyValue })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setIsProfilePublic(newPrivacyValue);
    } catch (error) {
      console.error('Error updating profile privacy:', error);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user?.id || !e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const file = e.target.files[0];
      
      if (file.size > 2 * 1024 * 1024) {
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        return;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      const { data: buckets } = await supabase.storage.listBuckets();
      const avatarBucketExists = buckets?.some(bucket => bucket.name === 'avatars');
      
      if (!avatarBucketExists) {
        const { error: bucketError } = await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 1024 * 1024 * 2
        });
        
        if (bucketError) {
          console.error('Error creating bucket:', bucketError);
        }
      }
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const publicUrl = data.publicUrl;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }
      
      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!username.trim()) {
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          bio: bio.trim(),
          contact_email: email.trim(),
          contact_phone: phone.trim(),
          is_public: isProfilePublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);
        
      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </Layout>
    );
  }
  
  if (!isAuthenticated && isOwnProfile && !userId) {
    return <Navigate to="/auth" />;
  }

  return (
    <Layout>
      <div className="w-full">
        {/* Profile Header */}
        <div className="w-full bg-background border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={avatarUrl || ''} alt={username || 'User'} />
                    <AvatarFallback className="text-xl">
                      {username ? username.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isOwnProfile && (
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="h-3 w-3" />
                      <input 
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadAvatar}
                      />
                    </label>
                  )}
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{username || 'User'}</h2>
                  {!isOwnProfile && <p className="text-sm text-muted-foreground mt-1">{bio}</p>}
                  
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
                  <Button 
                    variant={isFollowing ? "outline" : "default"}
                    className="flex-1" 
                    onClick={handleToggleFollow}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
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
            <TabsList className="grid w-full grid-cols-3 bg-background border-b border-border rounded-none">
              {isOwnProfile ? (
                <>
                  <TabsTrigger value="settings" className="border-b-2 border-transparent data-[state=active]:border-primary">Settings</TabsTrigger>
                  <TabsTrigger value="saved" className="border-b-2 border-transparent data-[state=active]:border-primary">Saved</TabsTrigger>
                  <TabsTrigger value="posts" className="border-b-2 border-transparent data-[state=active]:border-primary">Posts</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="posts" className="border-b-2 border-transparent data-[state=active]:border-primary">Posts</TabsTrigger>
                  <TabsTrigger value="followers" className="border-b-2 border-transparent data-[state=active]:border-primary">Followers</TabsTrigger>
                  <TabsTrigger value="following" className="border-b-2 border-transparent data-[state=active]:border-primary">Following</TabsTrigger>
                </>
              )}
            </TabsList>
            
            {isOwnProfile ? (
              <>
                <TabsContent value="settings" className="p-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Set your username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea 
                        id="bio" 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself"
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Contact Email (optional)</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your contact email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (optional)</Label>
                      <Input 
                        id="phone" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Your phone number"
                      />
                    </div>
                    
                    <Button onClick={handleSaveProfile} className="w-full">
                      Save Profile
                    </Button>
                    
                    <div className="pt-4 border-t border-border">
                      <Button variant="destructive" onClick={logout} className="w-full">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="saved">
                  <div className="space-y-0">
                    {savedConfessions.length > 0 ? (
                      <div className="space-y-0">
                        {savedConfessions.map(confession => (
                          <ConfessionCard 
                            key={confession.id} 
                            confession={confession}
                            onUpdate={() => setActiveTab('saved')}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 mx-4">
                        <p className="text-muted-foreground">You haven't saved any confessions yet.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="posts">
                  <UserConfessions onUpdate={() => setActiveTab('posts')} />
                </TabsContent>
              </>
            ) : (
              <>
                <TabsContent value="posts">
                  {profileUser?.is_public === false && !isAuthenticated ? (
                    <div className="text-center py-12 mx-4">
                      <EyeOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">This is a private profile.</p>
                    </div>
                  ) : (
                    <UserConfessions userId={userId} />
                  )}
                </TabsContent>
                
                <TabsContent value="followers">
                  <div className="text-center py-12 mx-4">
                    <p className="text-muted-foreground">User followers will appear here</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="following">
                  <div className="text-center py-12 mx-4">
                    <p className="text-muted-foreground">Users this person follows will appear here</p>
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
          targetUsername={profileUser?.username}
          targetAvatarUrl={profileUser?.avatar_url}
        />
      </div>
    </Layout>
  );
}
