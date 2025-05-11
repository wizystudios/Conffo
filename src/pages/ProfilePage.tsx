
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
import { AlertCircle, User, Save, Download, LogOut, Upload, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, updateUsername, updateUserProfile, logout, getSavedConfessions } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savedConfessions, setSavedConfessions] = useState<Confession[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setBio(user.bio || '');
      setEmail(user.contactEmail || '');
      setPhone(user.contactPhone || '');
      setAvatarUrl(user.avatarUrl || null);
    }
  }, [user]);

  useEffect(() => {
    const fetchSavedConfessions = async () => {
      if (!isAuthenticated) return;
      
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
  }, [isAuthenticated, user?.id, getSavedConfessions]);

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
    }
  };
  
  const downloadConfession = (confession: Confession) => {
    // Create text content
    const text = `
      Confession from ${new Date(confession.timestamp).toLocaleString()}
      Room: ${confession.room}
      
      ${confession.content}
      
      Reactions:
      👍 ${confession.reactions.like} | 😂 ${confession.reactions.laugh} | 😲 ${confession.reactions.shock} | ❤️ ${confession.reactions.heart}
      
      Comments: ${confession.commentCount}
      
      Downloaded from ConfessZone
    `.trim();
    
    // Create blob and download link
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confession-${confession.id.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Confession Downloaded",
      description: "The confession has been saved to your device",
    });
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
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  return (
    <Layout>
      <div className="space-y-6 container py-4 sm:py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <User className="h-5 w-5 md:h-6 md:w-6" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Manage your profile and content
            </CardDescription>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
              <TabsTrigger value="posts">My Posts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings">
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative mb-4">
                    <Avatar className="h-24 w-24 border-2 border-border">
                      <AvatarImage src={avatarUrl || ''} alt={username || 'User'} />
                      <AvatarFallback className="text-2xl">
                        {username ? username.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90 transition-colors"
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
                  </div>
                  {uploadingImage && <p className="text-xs text-muted-foreground">Uploading...</p>}
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
                
                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSaveProfile}>Save Profile</Button>
                </div>
                
                <div className="pt-4">
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-md flex gap-2 text-amber-800 dark:text-amber-300">
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
              <CardFooter className="border-t pt-6">
                <Button variant="destructive" onClick={logout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </CardFooter>
            </TabsContent>
            
            <TabsContent value="saved">
              <CardContent>
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
                    <div className="text-center py-8 border border-dashed rounded-md">
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
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Your Confessions</h3>
                  </div>
                  
                  <UserConfessions onUpdate={() => setActiveTab('posts')} />
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
}
