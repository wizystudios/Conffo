import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Palette, Sparkles, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

const AVATAR_STYLES = [
  { id: 'micah', name: 'Micah', seed: 'micah' },
  { id: 'avataaars', name: 'Cartoon', seed: 'avataaars' },
  { id: 'personas', name: 'Personas', seed: 'personas' },
  { id: 'adventurer', name: 'Adventure', seed: 'adventurer' },
  { id: 'pixel-art', name: 'Pixel', seed: 'pixel-art' },
  { id: 'fun-emoji', name: 'Emoji', seed: 'fun-emoji' }
];

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

interface AvatarCustomizationProps {
  onAvatarUpdate?: (avatarUrl: string) => void;
}

export function AvatarCustomization({ onAvatarUpdate }: AvatarCustomizationProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedStyle, setSelectedStyle] = useState('micah');
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [customSeed, setCustomSeed] = useState(user?.id || 'default');
  const [isUploading, setIsUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string>('');

  const generateAvatarUrl = (style: string, seed: string, backgroundColor?: string) => {
    const bgParam = backgroundColor ? `&backgroundColor=${backgroundColor.replace('#', '')}` : '';
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}${bgParam}`;
  };

  const handleStyleChange = (style: string) => {
    setSelectedStyle(style);
    const newAvatar = generateAvatarUrl(style, customSeed, selectedColor);
    setCurrentAvatar(newAvatar);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    const newAvatar = generateAvatarUrl(selectedStyle, customSeed, color);
    setCurrentAvatar(newAvatar);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = data.publicUrl;
      setCurrentAvatar(avatarUrl);

      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        description: "Avatar uploaded successfully!"
      });

      if (onAvatarUpdate) {
        onAvatarUpdate(avatarUrl);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        description: "Failed to upload avatar"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!user || !currentAvatar) return;

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: currentAvatar })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        description: "Avatar saved successfully!"
      });

      if (onAvatarUpdate) {
        onAvatarUpdate(currentAvatar);
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast({
        variant: "destructive",
        description: "Failed to save avatar"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadAvatar = () => {
    if (!currentAvatar) return;
    
    const link = document.createElement('a');
    link.href = currentAvatar;
    link.download = `avatar-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Avatar Customization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Avatar Preview */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-32 w-32 border-4 border-primary/20">
            <AvatarImage 
              src={currentAvatar || generateAvatarUrl(selectedStyle, customSeed, selectedColor)} 
              alt="Avatar preview" 
            />
            <AvatarFallback>AV</AvatarFallback>
          </Avatar>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveGenerated} 
              disabled={isUploading}
              size="sm"
            >
              Save Avatar
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadAvatar}
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Upload Custom Image */}
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Upload Custom Avatar
          </h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Choose File'}
          </Button>
        </div>

        {/* Avatar Styles */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Generated Avatars
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {AVATAR_STYLES.map((style) => (
              <div
                key={style.id}
                className={`cursor-pointer p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                  selectedStyle === style.seed
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleStyleChange(style.seed)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={generateAvatarUrl(style.seed, customSeed)} 
                      alt={style.name} 
                    />
                    <AvatarFallback>{style.name[0]}</AvatarFallback>
                  </Avatar>
                  <Badge variant="outline" className="text-xs">
                    {style.name}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div className="space-y-3">
          <h3 className="font-semibold">Background Colors</h3>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  selectedColor === color ? 'border-primary scale-110' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Custom Seed Input */}
        <div className="space-y-2">
          <h3 className="font-semibold">Custom Style Seed</h3>
          <input
            type="text"
            value={customSeed}
            onChange={(e) => {
              setCustomSeed(e.target.value);
              const newAvatar = generateAvatarUrl(selectedStyle, e.target.value, selectedColor);
              setCurrentAvatar(newAvatar);
            }}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter custom seed..."
          />
          <p className="text-xs text-muted-foreground">
            Change this text to generate different variations of the same style
          </p>
        </div>
      </CardContent>
    </Card>
  );
}