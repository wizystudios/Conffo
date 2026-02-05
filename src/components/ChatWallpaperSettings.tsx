import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatWallpaperSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onWallpaperChange?: (url: string | null) => void;
}

// Preset patterns
const PRESET_PATTERNS = [
  { id: 'cosmic', name: 'Cosmic', gradient: 'from-purple-900/20 via-indigo-900/10 to-purple-900/20' },
  { id: 'aurora', name: 'Aurora', gradient: 'from-green-900/20 via-cyan-900/10 to-blue-900/20' },
  { id: 'sunset', name: 'Sunset', gradient: 'from-orange-900/20 via-pink-900/10 to-purple-900/20' },
  { id: 'ocean', name: 'Ocean', gradient: 'from-blue-900/20 via-teal-900/10 to-blue-900/20' },
  { id: 'forest', name: 'Forest', gradient: 'from-green-900/20 via-emerald-900/10 to-green-900/20' },
  { id: 'midnight', name: 'Midnight', gradient: 'from-slate-900/30 via-gray-900/20 to-slate-900/30' },
];

export function ChatWallpaperSettings({ isOpen, onClose, onWallpaperChange }: ChatWallpaperSettingsProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<string>('cosmic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `wallpaper-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('chat-wallpapers')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-wallpapers')
        .getPublicUrl(filePath);

      setCustomWallpaper(urlData.publicUrl);
      setSelectedPattern('custom');
      onWallpaperChange?.(urlData.publicUrl);
      toast.success('Wallpaper uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload wallpaper');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePatternSelect = (patternId: string) => {
    setSelectedPattern(patternId);
    setCustomWallpaper(null);
    
    if (patternId === 'custom') {
      fileInputRef.current?.click();
    } else {
      onWallpaperChange?.(null); // Use pattern instead of custom image
    }
  };

  const handleRemoveWallpaper = async () => {
    if (!user) return;

    try {
      const { data } = await supabase.storage
        .from('chat-wallpapers')
        .list(user.id);

      if (data) {
        for (const file of data) {
          await supabase.storage
            .from('chat-wallpapers')
            .remove([`${user.id}/${file.name}`]);
        }
      }

      setCustomWallpaper(null);
      setSelectedPattern('cosmic');
      onWallpaperChange?.(null);
      toast.success('Wallpaper removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove wallpaper');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="conffo-glass-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Chat Wallpaper
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preset patterns */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Patterns</h3>
          <div className="grid grid-cols-3 gap-3">
            {PRESET_PATTERNS.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => handlePatternSelect(pattern.id)}
                className={cn(
                  "aspect-square rounded-xl relative overflow-hidden border-2 transition-all",
                  selectedPattern === pattern.id 
                    ? "border-primary ring-2 ring-primary/30" 
                    : "border-transparent hover:border-border"
                )}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  pattern.gradient
                )} />
                <div className="absolute inset-0 flex items-end p-2">
                  <span className="text-[10px] font-medium">{pattern.name}</span>
                </div>
                {selectedPattern === pattern.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom wallpaper */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Custom Image</h3>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {customWallpaper ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border">
              <img 
                src={customWallpaper} 
                alt="Custom wallpaper" 
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleRemoveWallpaper}
                className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm"
              >
                <X className="h-4 w-4" />
              </button>
              {selectedPattern === 'custom' && (
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors"
            >
              {isUploading ? (
                <div className="conffo-spinner h-8 w-8" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload your image</span>
                  <span className="text-xs text-muted-foreground/60">Max 5MB</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Preview */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Preview</h3>
          <div 
            className="aspect-video rounded-xl overflow-hidden border relative"
            style={customWallpaper ? { backgroundImage: `url(${customWallpaper})`, backgroundSize: 'cover' } : {}}
          >
            {!customWallpaper && (
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br",
                PRESET_PATTERNS.find(p => p.id === selectedPattern)?.gradient || PRESET_PATTERNS[0].gradient
              )} />
            )}
            {/* Sample chat bubbles */}
            <div className="absolute inset-0 p-4 flex flex-col justify-end gap-2">
              <div className="self-start max-w-[70%] bg-muted/80 backdrop-blur-sm rounded-2xl rounded-tl-sm px-3 py-2">
                <span className="text-xs">Hello there!</span>
              </div>
              <div className="self-end max-w-[70%] bg-primary/80 backdrop-blur-sm text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2">
                <span className="text-xs">Hey! How are you?</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onClose} className="flex-1">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
