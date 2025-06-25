
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

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
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Determine if viewing own profile or someone else's
  useEffect(() => {
    if (userId && user) {
      setIsOwnProfile(userId === user.id);
      setActiveTab(userId === user.id ? 'settings' : 'posts');
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
            const defaultUsername = user.email?.split('@')[0] || 'User';
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                username: defaultUsername,
                updated_at: new Date().toISOString()
              });
            
            if (insertError) {
              console.error('Error creating profile:', insertError);
            } else {
              setUsername(defaultUsername);
            }
          }
        }
        
        // Check follow status and get counts
        if (user && !isOwnProfile && targetUserId) {
          await Promise.all([
            checkFollowStatus(targetUserId),
            getFollowCounts(targetUserId)
          ]);
        } else if (targetUserId) {
          await getFollowCounts(targetUserId);
        }
        
      } catch (error) {
        console.error('Error in fetchProfileData:', error);
      }
    };

    fetchProfileData();
  }, [userId, user, isOwnProfile, isAuthenticated]);

  const checkFollowStatus = async (targetUserId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking follow status:', error);
        setIsFollowing(false);
      } else {
        setIsFollowing(!!data);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
      setIsFollowing(false);
    }
  };

  const getFollowCounts = async (targetUserId: string) => {
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
    } catch (error) {
      console.error('Error getting follow counts:', error);
      setFollowersCount(0);
      setFollowingCount(0);
    }
  };

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
    if (!user || !userId || isOwnProfile || isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
          
        if (error) throw error;
        
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        
        toast({
          description: "Unfollowed successfully"
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });
          
        if (error) throw error;
        
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        
        toast({
          description: "Followed successfully"
        });
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['confessions'] });
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        variant: "destructive",
        description: "Failed to update follow status"
      });
    } finally {
      setIsUpdating(false);
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
      
      toast({
        description: newPrivacyValue ? "Profile is now public" : "Profile is now private"
      });
    } catch (error) {
      console.error('Error updating profile privacy:', error);
      toast({
        variant: "destructive",
        description: "Failed to update privacy settings"
      });
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user?.id || !e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const file = e.target.files[0];
      
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          description: "File size must be less than 2MB"
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          description: "Please upload an image file"
        });
        return;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
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
      
      toast({
        description: "Profile picture updated successfully"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        description: "Failed to upload profile picture"
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id || isSaving) return;
    
    try {
      if (!username.trim()) {
        toast({
          variant: "destructive",
          description: "Username cannot be empty"
        });
        return;
      }
      
      setIsSaving(true);
      
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
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
      
      // Invalidate queries that might use profile data
      queryClient.invalidateQueries({ queryKey: ['confessions'] });
      
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
                    disabled={isUpdating}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        {isUpdating ? 'Updating...' : 'Unfollow'}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {isUpdating ? 'Following...' : 'Follow'}
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
                            ? "Anyone can view your profile" 
                            : "Only followers can see your profile"
                          }
                        </p>
                      </div>
                      <Switch 
                        checked={isProfilePublic} 
                        onCheckedChange={handleToggleProfilePrivacy}
                      />
                    </div>

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
                      className="w-full"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </div>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Profile
                        </>
                      )}
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
