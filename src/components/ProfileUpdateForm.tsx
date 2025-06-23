
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { User, Save } from 'lucide-react';

export function ProfileUpdateForm() {
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeProfile = async () => {
      if (!user) return;

      try {
        // Get current profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        } else {
          // Extract username from email if no username exists
          const emailUsername = user.email?.split('@')[0] || '';
          setUsername(emailUsername);
          
          // Auto-save the username derived from email
          if (emailUsername) {
            await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                username: emailUsername,
                updated_at: new Date().toISOString()
              });
          }
        }
      } catch (error) {
        console.error('Error initializing profile:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isLoading) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username.trim(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Refresh user context
      if (refreshUser) {
        await refreshUser();
      }

      toast({
        title: "Profile updated",
        description: "Your username has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
          Update Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${user?.id}`} 
                alt={username || 'User'} 
              />
              <AvatarFallback>
                {username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Profile Picture</p>
              <p className="text-xs text-muted-foreground">Auto-generated based on your ID</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              This will be displayed on your posts and profile
            </p>
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
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
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
