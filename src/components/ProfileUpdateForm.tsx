
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { User, Save, Camera, Eye, EyeOff } from 'lucide-react';

export function ProfileUpdateForm() {
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const initializeProfile = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, is_public')
          .eq('id', user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        } else {
          // Extract username from email
          const emailUsername = user.email?.split('@')[0] || 'user';
          setUsername(emailUsername);
          
          // Auto-save the username
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              username: emailUsername,
              updated_at: new Date().toISOString()
            });
        }

        setIsProfilePublic(profile?.is_public !== false);
      } catch (error) {
        console.error('Error initializing profile:', error);
        // Fallback to email-derived username
        if (user.email) {
          const emailUsername = user.email.split('@')[0];
          setUsername(emailUsername);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isLoading || !username.trim()) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username.trim(),
          is_public: isProfilePublic,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      if (refreshUser) {
        await refreshUser();
      }

      toast({
        description: "Profile updated",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        description: "Update failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    setUploadingImage(true);
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      if (refreshUser) await refreshUser();
      
      toast({
        description: "Profile picture updated",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        description: "Upload failed",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!user) return;
    
    try {
      const newPrivacy = !isProfilePublic;
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_public: newPrivacy })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setIsProfilePublic(newPrivacy);
      toast({
        description: newPrivacy ? "Profile is now public" : "Profile is now private"
      });
    } catch (error) {
      console.error('Error updating privacy:', error);
      toast({
        variant: "destructive",
        description: "Privacy update failed"
      });
    }
  };

  if (isInitializing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={user?.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${user?.id}`} 
                  alt={username || 'User'} 
                />
                <AvatarFallback>
                  {username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
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
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profile Picture</p>
              {uploadingImage && <p className="text-xs text-primary">Uploading...</p>}
            </div>
          </div>

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
              onCheckedChange={handleTogglePrivacy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              required
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Update Profile
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
