import { useState, useRef, useEffect } from 'react';
import { Upload, X, Palette, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatWallpaperSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onWallpaperChange?: (url: string | null, pattern?: string) => void;
}

const PRESET_PATTERNS = [
  { id: 'cosmic', name: 'Cosmic', gradient: 'from-foreground/10 via-muted/20 to-foreground/10' },
  { id: 'aurora', name: 'Aurora', gradient: 'from-muted/30 via-accent/20 to-muted/30' },
  { id: 'sunset', name: 'Sunset', gradient: 'from-destructive/10 via-muted/10 to-foreground/10' },
  { id: 'ocean', name: 'Ocean', gradient: 'from-primary/10 via-accent/15 to-primary/10' },
  { id: 'forest', name: 'Forest', gradient: 'from-accent/20 via-muted/15 to-accent/20' },
  { id: 'midnight', name: 'Midnight', gradient: 'from-foreground/20 via-foreground/10 to-foreground/20' },
];

const GALLERY_WALLPAPERS = [
  { id: 'cosmic-tree', name: 'Cosmic Tree', url: '/wallpapers/cosmic-tree.png' },
  { id: 'penguin-heart', name: 'Penguin', url: '/wallpapers/penguin-heart.png' },
  { id: 'dark-hoodie', name: 'Dark Hoodie', url: '/wallpapers/dark-hoodie.png' },
  { id: 'mountain-lake', name: 'Mountain Lake', url: '/wallpapers/mountain-lake.png' },
  { id: 'shiva-statue', name: 'Shiva', url: '/wallpapers/shiva-statue.png' },
  { id: 'fuji-galaxy', name: 'Mt. Fuji', url: '/wallpapers/fuji-galaxy.png' },
  { id: 'reflection-tree', name: 'Reflection', url: '/wallpapers/reflection-tree.png' },
  { id: 'glowing-tree', name: 'Glow', url: '/wallpapers/glowing-tree.png' },
  { id: 'cracked-glass', name: 'Cracked', url: '/wallpapers/cracked-glass.png' },
];

const WALLPAPER_STORAGE_KEY = 'conffo_chat_wallpaper';

export function getChatWallpaperPreference(): { type: 'pattern' | 'custom' | 'gallery'; value: string } {
  try {
    const stored = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { type: 'pattern', value: 'cosmic' };
}

export function ChatWallpaperSettings({ isOpen, onClose, onWallpaperChange }: ChatWallpaperSettingsProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'pattern' | 'custom' | 'gallery'>('pattern');
  const [selectedValue, setSelectedValue] = useState<string>('cosmic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const pref = getChatWallpaperPreference();
      setSelectedType(pref.type);
      setSelectedValue(pref.value);
      if (pref.type === 'custom') {
        setCustomWallpaper(pref.value);
      }
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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

      const { error: uploadError } = await supabase.storage
        .from('chat-wallpapers')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-wallpapers')
        .getPublicUrl(filePath);

      setCustomWallpaper(urlData.publicUrl);
      setSelectedType('custom');
      setSelectedValue(urlData.publicUrl);
      toast.success('Wallpaper uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload wallpaper');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePatternSelect = (patternId: string) => {
    setSelectedType('pattern');
    setSelectedValue(patternId);
  };

  const handleGallerySelect = (wallpaper: typeof GALLERY_WALLPAPERS[0]) => {
    setSelectedType('gallery');
    setSelectedValue(wallpaper.url);
  };

  const handleRemoveCustom = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.storage.from('chat-wallpapers').list(user.id);
      if (data) {
        for (const file of data) {
          await supabase.storage.from('chat-wallpapers').remove([`${user.id}/${file.name}`]);
        }
      }
      setCustomWallpaper(null);
      setSelectedType('pattern');
      setSelectedValue('cosmic');
      toast.success('Custom wallpaper removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove wallpaper');
    }
  };

  const handleApply = () => {
    const pref = { type: selectedType, value: selectedValue };
    localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(pref));
    
    if (selectedType === 'custom') {
      onWallpaperChange?.(selectedValue);
    } else if (selectedType === 'gallery') {
      onWallpaperChange?.(selectedValue);
    } else {
      onWallpaperChange?.(null, selectedValue);
    }
    toast.success('Wallpaper applied!');
    onClose();
  };

  if (!isOpen) return null;

  const getPreviewStyle = () => {
    if (selectedType === 'custom' && customWallpaper) {
      return { backgroundImage: `url(${customWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    if (selectedType === 'gallery') {
      return { backgroundImage: `url(${selectedValue})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return {};
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-background rounded-t-3xl p-4 pb-8 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Chat Wallpaper
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Gallery Wallpapers */}
        <div className="mb-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            Gallery
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {GALLERY_WALLPAPERS.map((wallpaper) => (
              <button
                key={wallpaper.id}
                onClick={() => handleGallerySelect(wallpaper)}
                className={cn(
                  "aspect-[3/4] rounded-xl relative overflow-hidden border-2 transition-all",
                  selectedType === 'gallery' && selectedValue === wallpaper.url
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-border"
                )}
              >
                <img src={wallpaper.url} alt={wallpaper.name} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex items-end p-1.5">
                  <span className="text-[9px] font-medium text-white">{wallpaper.name}</span>
                </div>
                {selectedType === 'gallery' && selectedValue === wallpaper.url && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preset patterns */}
        <div className="mb-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Patterns</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {PRESET_PATTERNS.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => handlePatternSelect(pattern.id)}
                className={cn(
                  "aspect-square rounded-xl relative overflow-hidden border-2 transition-all",
                  selectedType === 'pattern' && selectedValue === pattern.id 
                    ? "border-primary ring-2 ring-primary/30" 
                    : "border-transparent hover:border-border"
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br", pattern.gradient)} />
                <div className="absolute inset-0 flex items-end p-2">
                  <span className="text-[10px] font-medium">{pattern.name}</span>
                </div>
                {selectedType === 'pattern' && selectedValue === pattern.id && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom wallpaper */}
        <div className="mb-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Custom Image</h3>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

          {customWallpaper ? (
            <div 
              className={cn(
                "relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all",
                selectedType === 'custom' ? "border-primary ring-2 ring-primary/30" : "border-transparent"
              )}
              onClick={() => { setSelectedType('custom'); setSelectedValue(customWallpaper); }}
            >
              <img src={customWallpaper} alt="Custom wallpaper" className="w-full h-full object-cover" />
              <button 
                onClick={(e) => { e.stopPropagation(); handleRemoveCustom(); }} 
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm"
              >
                <X className="h-4 w-4" />
              </button>
              {selectedType === 'custom' && (
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
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
        <div className="mb-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Preview</h3>
          <div 
            className="aspect-video rounded-xl overflow-hidden border relative"
            style={getPreviewStyle()}
          >
            {selectedType === 'pattern' && (
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br",
                PRESET_PATTERNS.find(p => p.id === selectedValue)?.gradient || PRESET_PATTERNS[0].gradient
              )} />
            )}
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
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleApply} className="flex-1">Apply</Button>
        </div>
      </div>
    </div>
  );
}
