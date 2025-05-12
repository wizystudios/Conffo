
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
import { AlertCircle, User, Save, Download, LogOut, Upload, Camera, UserPlus, Users, UserMinus, Eye, EyeOff, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Navigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase, checkIfFollowing, getFollowersCount, getFollowingCount, addFollow, removeFollow } from '@/integrations/supabase/client';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { Switch } from '@/components/ui/switch';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, isAuthenticated, isLoading, updateUsername, updateUserProfile, logout, getSavedConfessions } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savedConfessions, setSavedConfessions] = useState<Confession[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [profilePrivacyLoading, setProfilePrivacyLoading] = useState(false);

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
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        setProfileUser(data);
        
        if (isOwnProfile) {
          setUsername(data.username || '');
          setBio(data.bio || '');
          setEmail(data.contact_email || '');
          setPhone(data.contact_phone || '');
          setIsProfilePublic(data.is_public !== false); // Default to true if not set
        } else {
          setUsername(data.username || 'Anonymous User');
          setBio(data.bio || 'No bio available');
          // Check if profile is public
          if (data.is_public === false && !isAuthenticated) {
            // If profile is private and viewer is not authenticated, show limited info
            setBio('This profile is private');
          }
        }
        
        setAvatarUrl(data.avatar_url || null);
        
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

  useEffect(() => {
    const fetchSavedConfessions = async () => {
      if (!isAuthenticated || !isOwnProfile) return;
      
      setLoadingSaved(true);
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
      } finally {
        setLoadingSaved(false);
      }
    };
    
    fetchSavedConfessions();
  }, [isAuthenticated, user?.id, getSavedConfessions, isOwnProfile]);

  const handleToggleFollow = async () => {
    if (!user || !userId || isOwnProfile || loadingFollow) return;
    
    setLoadingFollow(true);
    try {
      if (isFollowing) {
        // Unfollow
        await removeFollow(user.id, userId);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        toast({
          description: "You have unfollowed this user"
        });
      } else {
        // Follow
        await addFollow(user.id, userId);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast({
          description: "You are now following this user"
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        variant: "destructive",
        description: isFollowing ? "Failed to unfollow user" : "Failed to follow user"
      });
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleToggleProfilePrivacy = async () => {
    if (!isOwnProfile || !user) return;
    
    setProfilePrivacyLoading(true);
    try {
      const newPrivacyValue = !isProfilePublic;
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_public: newPrivacyValue })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setIsProfilePublic(newPrivacyValue);
      toast({
        description: newPrivacyValue ? "Your profile is now public" : "Your profile is now private"
      });
    } catch (error) {
      console.error('Error updating profile privacy:', error);
      toast({
        variant: "destructive",
        description: "Failed to update profile privacy settings"
      });
    } finally {
      setProfilePrivacyLoading(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user?.id || !e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      setUploadingImage(true);
      
      // Create avatars bucket if it doesn't exist
      const { data: buckets } = await supabase.storage.listBuckets();
      const avatarBucketExists = buckets?.some(bucket => bucket.name === 'avatars');
      
      if (!avatarBucketExists) {
        await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 1024 * 1024 * 2 // 2MB
        });
      }
      
      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const publicUrl = data.publicUrl;
      
      // Update user profile with new avatar URL
      await updateUserProfile({
        avatarUrl: publicUrl
      });
      
      setAvatarUrl(publicUrl);
      
      toast({
        description: "Profile picture updated successfully"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        description: "Failed to update profile picture"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!username.trim()) {
        toast({
          title: "Username cannot be empty",
          description: "Please enter a valid username",
          variant: "destructive"
        });
        return;
      }
      
      setIsSaving(true);
      
      await updateUserProfile({
        username: username.trim(),
        bio,
        contactEmail: email,
        contactPhone: phone
      });
      
      toast({
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        description: "Failed to update profile"
      });
    } finally {
      setIsSaving(false);
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
      <div className="space-y-6 container py-4 sm:py-6">
        <Card className="overflow-hidden shadow-md">
          <CardHeader className="pb-4 px-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-2 border-border shadow-sm">
                    <AvatarImage src={avatarUrl || ''} alt={username || 'User'} />
                    <AvatarFallback className="text-2xl">
                      {username ? username.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isOwnProfile && (
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Camera className="h-4 w-4" />
                      <input 
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadAvatar}
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>
                
                <div className="text-center md:text-left">
                  <h2 className="text-xl font-bold mb-1">{username || 'Anonymous User'}</h2>
                  {!isOwnProfile && <p className="text-sm text-muted-foreground mt-1 mb-3 max-w-md">{bio}</p>}
                  
                  <div className="flex items-center justify-center md:justify-start gap-6 mt-3">
                    <div className="text-center bg-muted/30 px-4 py-2 rounded-lg">
                      <p className="font-medium text-lg">{followersCount}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    
                    <div className="text-center bg-muted/30 px-4 py-2 rounded-lg">
                      <p className="font-medium text-lg">{followingCount}</p>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {!isOwnProfile && isAuthenticated && (
                <Button 
                  variant={isFollowing ? "outline" : "default"}
                  className="gap-2 shadow-sm" 
                  onClick={handleToggleFollow}
                  disabled={loadingFollow}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 px-6 bg-muted/20">
              {isOwnProfile ? (
                <>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="saved">Saved</TabsTrigger>
                  <TabsTrigger value="posts">My Posts</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="followers">Followers</TabsTrigger>
                  <TabsTrigger value="following">Following</TabsTrigger>
                </>
              )}
            </TabsList>
            
            {isOwnProfile ? (
              <>
                <TabsContent value="settings">
                  <CardContent className="space-y-6 px-6 py-4">
                    {uploadingImage && (
                      <div className="text-xs text-muted-foreground bg-primary/10 p-3 rounded-md">
                        Uploading profile picture...
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
                      <div>
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          {isProfilePublic ? (
                            <>
                              <Eye className="h-4 w-4 text-green-500" />
                              Public Profile
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4 text-amber-500" />
                              Private Profile
                            </>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isProfilePublic 
                            ? "Anyone can view your profile and posts" 
                            : "Only followers can see your profile details"
                          }
                        </p>
                      </div>
                      <Switch 
                        checked={isProfilePublic} 
                        onCheckedChange={handleToggleProfilePrivacy}
                        disabled={profilePrivacyLoading}
                      />
                    </div>
                    
                    <div className="bg-card p-4 rounded-lg border shadow-sm">
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Profile Settings
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input 
                            id="username" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Set your username"
                            className="shadow-sm"
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
                            className="shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 mt-6">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number (optional)</Label>
                          <Input 
                            id="phone" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Your phone number"
                            className="shadow-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea 
                            id="bio" 
                            value={bio} 
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself"
                            className="min-h-[80px] shadow-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-6">
                        <Button 
                          onClick={handleSaveProfile} 
                          disabled={isSaving}
                          className="w-full md:w-auto shadow-sm"
                        >
                          {isSaving ? "Saving..." : "Save Profile"}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-md flex gap-3 text-amber-800 dark:text-amber-300">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Anonymous Usage</p>
                          <p className="text-xs mt-1">
                            Your confessions are posted anonymously. Your profile information is only visible to moderators.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-6 px-6">
                    <Button variant="destructive" onClick={logout} className="gap-2 shadow-sm">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </CardFooter>
                </TabsContent>
                
                <TabsContent value="saved">
                  <CardContent className="px-6 py-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Save className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Your Saved Confessions</h3>
                      </div>
                      
                      {loadingSaved ? (
                        <p className="text-center py-8 text-muted-foreground">Loading saved confessions...</p>
                      ) : savedConfessions.length > 0 ? (
                        <div className="space-y-4">
                          {savedConfessions.map(confession => (
                            <ConfessionCard 
                              key={confession.id} 
                              confession={confession}
                              onUpdate={() => setActiveTab('saved')}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border border-dashed rounded-md bg-muted/10">
                          <p className="text-muted-foreground">You haven't saved any confessions yet.</p>
                          <p className="text-sm mt-2">
                            When you find interesting confessions, click the save button to add them here.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </TabsContent>

                <TabsContent value="posts">
                  <CardContent className="px-6 py-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Your Confessions</h3>
                      </div>
                      
                      <UserConfessions onUpdate={() => setActiveTab('posts')} />
                    </div>
                  </CardContent>
                </TabsContent>
              </>
            ) : (
              <>
                <TabsContent value="posts">
                  <CardContent className="px-6 py-4">
                    <div className="space-y-4">
                      {profileUser?.is_public === false && !isAuthenticated ? (
                        <div className="text-center py-8 border border-dashed rounded-md">
                          <EyeOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">This is a private profile.</p>
                          <p className="text-sm mt-2">
                            Sign in to follow this user and see their content.
                          </p>
                        </div>
                      ) : (
                        <UserConfessions userId={userId} />
                      )}
                    </div>
                  </CardContent>
                </TabsContent>
                
                <TabsContent value="followers">
                  <CardContent className="px-6 py-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Followers</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {profileUser?.is_public === false && !isAuthenticated ? (
                          <div className="text-center py-8 border border-dashed rounded-md">
                            <EyeOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">This information is private.</p>
                            <p className="text-sm mt-2">
                              Sign in to follow this user and see their followers.
                            </p>
                          </div>
                        ) : (
                          <p className="text-center py-12 text-muted-foreground">
                            User followers will appear here
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
                
                <TabsContent value="following">
                  <CardContent className="px-6 py-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <UserPlus className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Following</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {profileUser?.is_public === false && !isAuthenticated ? (
                          <div className="text-center py-8 border border-dashed rounded-md">
                            <EyeOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">This information is private.</p>
                            <p className="text-sm mt-2">
                              Sign in to follow this user and see who they follow.
                            </p>
                          </div>
                        ) : (
                          <p className="text-center py-12 text-muted-foreground">
                            Users this person follows will appear here
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
              </>
            )}
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
}
