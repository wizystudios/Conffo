import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Palette, Type, Image as ImageIcon, Video } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MessageSettingsProps {
  onClose: () => void;
}

const themes = [
  { name: 'Default', primary: '#3b82f6', secondary: '#1e40af' },
  { name: 'Purple', primary: '#8b5cf6', secondary: '#7c3aed' },
  { name: 'Green', primary: '#10b981', secondary: '#059669' },
  { name: 'Orange', primary: '#f59e0b', secondary: '#d97706' },
  { name: 'Pink', primary: '#ec4899', secondary: '#db2777' },
  { name: 'Red', primary: '#ef4444', secondary: '#dc2626' },
];

export function MessageSettings({ onClose }: MessageSettingsProps) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [selectedTheme, setSelectedTheme] = useState(themes[0]);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSaveDisplayName = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName }
      });

      if (error) throw error;

      toast({
        title: "Display name updated",
        description: "Your chat display name has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update display name",
        variant: "destructive"
      });
    }
  };

  const handleWallpaperUpload = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/wallpaper.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-wallpapers')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-wallpapers')
        .getPublicUrl(fileName);

      setWallpaper(data.publicUrl);
      
      // Apply wallpaper to chat background
      localStorage.setItem('chat-wallpaper', data.publicUrl);

      toast({
        title: "Wallpaper updated",
        description: "Your chat wallpaper has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload wallpaper",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const applyTheme = (theme: typeof themes[0]) => {
    setSelectedTheme(theme);
    localStorage.setItem('chat-theme', JSON.stringify(theme));
    
    // Apply theme colors to CSS variables
    document.documentElement.style.setProperty('--chat-primary', theme.primary);
    document.documentElement.style.setProperty('--chat-secondary', theme.secondary);

    toast({
      title: "Theme applied",
      description: `${theme.name} theme has been applied to your chats.`
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Message Settings
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="themes" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Themes
              </TabsTrigger>
              <TabsTrigger value="wallpaper" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Wallpaper
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>{displayName.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="displayName">Display Name in Chats</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How you appear in chats"
                    className="mt-1"
                  />
                  <Button onClick={handleSaveDisplayName} className="mt-2" size="sm">
                    Save Changes
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="themes" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {themes.map((theme) => (
                  <Card 
                    key={theme.name}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      selectedTheme.name === theme.name ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => applyTheme(theme)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <div>
                          <p className="font-medium">{theme.name}</p>
                          <div className="flex gap-1 mt-1">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: theme.primary }}
                            />
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: theme.secondary }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="wallpaper" className="space-y-4">
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleWallpaperUpload(file);
                  }}
                  accept="image/*,video/*"
                  className="hidden"
                />
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload Custom Wallpaper'}
                </Button>

                {wallpaper && (
                  <div className="space-y-2">
                    <Label>Current Wallpaper Preview</Label>
                    <div className="relative h-32 rounded-lg overflow-hidden border">
                      {wallpaper.includes('.mp4') || wallpaper.includes('.webm') ? (
                        <video 
                          src={wallpaper} 
                          className="w-full h-full object-cover"
                          muted
                          loop
                          autoPlay
                        />
                      ) : (
                        <img 
                          src={wallpaper} 
                          alt="Wallpaper preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    setWallpaper(null);
                    localStorage.removeItem('chat-wallpaper');
                    toast({
                      title: "Wallpaper removed",
                      description: "Chat wallpaper has been reset to default."
                    });
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Remove Wallpaper
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}