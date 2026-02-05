import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface ChatWallpaperProps {
  children: React.ReactNode;
  className?: string;
  pattern?: 'cosmic' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'midnight';
}

// Pattern class mapping
const PATTERN_CLASSES: Record<string, string> = {
  cosmic: 'chat-wallpaper-cosmic',
  aurora: 'chat-wallpaper-aurora',
  sunset: 'chat-wallpaper-sunset',
  ocean: 'bg-gradient-to-br from-blue-900/10 via-teal-900/5 to-blue-900/10',
  forest: 'bg-gradient-to-br from-green-900/10 via-emerald-900/5 to-green-900/10',
  midnight: 'bg-gradient-to-br from-slate-900/15 via-gray-900/10 to-slate-900/15',
};

export function ChatWallpaper({ children, className = '', pattern = 'cosmic' }: ChatWallpaperProps) {
  const { user } = useAuth();
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadUserWallpaper();
    }
  }, [user?.id]);

  const loadUserWallpaper = async () => {
    if (!user?.id) return;
    
    try {
      // Check if user has a custom wallpaper
      const { data } = await supabase.storage
        .from('chat-wallpapers')
        .list(user.id, { limit: 1 });
      
      if (data && data.length > 0) {
        const { data: urlData } = supabase.storage
          .from('chat-wallpapers')
          .getPublicUrl(`${user.id}/${data[0].name}`);
        setWallpaperUrl(urlData.publicUrl);
      }
    } catch (error) {
      console.error('Error loading wallpaper:', error);
    }
  };

  const getBackgroundStyle = () => {
    if (wallpaperUrl) {
      return {
        backgroundImage: `url(${wallpaperUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {};
  };

  return (
    <div 
      className={cn(
        "relative",
        !wallpaperUrl && PATTERN_CLASSES[pattern],
        className
      )}
      style={getBackgroundStyle()}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-background/20 pointer-events-none" />
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

// Hook for managing wallpaper
export function useChatWallpaper() {
  const { user } = useAuth();

  const uploadWallpaper = async (file: File) => {
    if (!user?.id) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `wallpaper.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('chat-wallpapers')
      .upload(filePath, file, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from('chat-wallpapers')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const removeWallpaper = async () => {
    if (!user?.id) return;

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
  };

  return { uploadWallpaper, removeWallpaper };
}
