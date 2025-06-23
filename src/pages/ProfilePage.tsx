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
          // Check if is_public is explicitly false, otherwise default to true
          setIsProfilePublic(data.is_public !== false);
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
      
      // Update the profile using the updateUserProfile function from AuthContext
      await updateUserProfile({
        username: username.trim(),
        bio: bio.trim(),
        contactEmail: email.trim(),
        contactPhone: phone.trim(),
        isPublic: isProfilePublic
      });
      
      // Also update the username separately to ensure it's saved
      if (user?.id) {
        const { error: usernameError } = await supabase
          .from('profiles')
          .update({ username: username.trim() })
          .eq('id', user.id);
          
        if (usernameError) {
          console.error('Error updating username:', usernameError);
        }
      }
      
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
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{username || 'Anonymous User'}</h2>
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
                <Button 
                  variant={isFollowing ? "outline" : "default"}
                  className="w-full" 
                  onClick={handleToggleFollow}
                  disabled={loadingFollow}
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
                  {uploadingImage && (
                    <div className="text-xs text-muted-foreground bg-primary/10 p-3 rounded-md mb-4">
                      Uploading profile picture...
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 mb-6">
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
                    
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? "Saving..." : "Save Profile"}
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
                    {loadingSaved ? (
                      <div className="flex justify-center py-12">
                        <p className="text-muted-foreground">Loading saved confessions...</p>
                      </div>
                    ) : savedConfessions.length > 0 ? (
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
      </div>
    </Layout>
  );
}
