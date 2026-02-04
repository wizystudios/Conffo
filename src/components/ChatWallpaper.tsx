import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ChatWallpaperProps {
  children: React.ReactNode;
  className?: string;
}

// Default patterns similar to WhatsApp/Telegram
const DEFAULT_PATTERNS = [
  'conffo', // Custom conffo pattern
  'dots',
  'circles',
  'waves',
  'geometric'
];

export function ChatWallpaper({ children, className = '' }: ChatWallpaperProps) {
  const { user } = useAuth();
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [pattern, setPattern] = useState<string>('conffo');

  useEffect(() => {
    if (user?.id) {
      loadUserWallpaper();
    }
  }, [user?.id]);

  const loadUserWallpaper = async () => {
    if (!user?.id) return;
    
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
  };

  // Generate pattern SVG based on theme
  const getPatternStyle = () => {
    if (wallpaperUrl) {
      return {
        backgroundImage: `url(${wallpaperUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }

    // Conffo-themed pattern with cosmic elements
    if (pattern === 'conffo') {
      return {
        backgroundColor: 'hsl(var(--background))',
        backgroundImage: `
          radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, hsl(var(--accent) / 0.05) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.02) 0%, transparent 60%),
          url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
        `,
        backgroundRepeat: 'repeat'
      };
    }

    return {};
  };

  return (
    <div 
      className={`relative ${className}`}
      style={getPatternStyle()}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-background/30 pointer-events-none" />
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
