import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Heart, 
  Bell, 
  Bookmark, 
  Sun, 
  Moon, 
  Settings, 
  LogOut, 
  Shield, 
  Palette,
  X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/utils/hapticFeedback";

interface FullPageMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FullPageMenu({ isOpen, onClose }: FullPageMenuProps) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    haptic.light();
    navigate(path);
    onClose();
  };

  const toggleTheme = () => {
    haptic.light();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    haptic.medium();
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out successfully" });
      navigate('/auth');
      onClose();
    } catch (error) {
      toast({ title: "Error", description: "Failed to log out", variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-background animate-in slide-in-from-top duration-300"
      style={{ borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}
    >
      {/* Close button */}
      <div className="flex justify-end p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="rounded-full"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Menu items */}
      <div className="px-6 py-4 space-y-2">
        <button
          onClick={() => handleNavigation('/profile')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted transition-colors"
        >
          <User className="h-6 w-6" />
          <span className="text-lg font-medium">Profile</span>
        </button>

        <button
          onClick={() => handleNavigation(`/user/${user?.id}?tab=liked`)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted transition-colors"
        >
          <Heart className="h-6 w-6" />
          <span className="text-lg font-medium">Liked</span>
        </button>

        <button
          onClick={() => handleNavigation('/notifications')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted transition-colors"
        >
          <Bell className="h-6 w-6" />
          <span className="text-lg font-medium">Notifications</span>
        </button>

        <button
          onClick={() => handleNavigation(`/user/${user?.id}?tab=saved`)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted transition-colors"
        >
          <Bookmark className="h-6 w-6" />
          <span className="text-lg font-medium">Saved</span>
        </button>

        <div className="border-t border-border my-4" />

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          <span className="text-lg font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button
          onClick={() => handleNavigation('/profile?tab=settings')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted transition-colors"
        >
          <Settings className="h-6 w-6" />
          <span className="text-lg font-medium">Settings</span>
        </button>

        <button
          onClick={() => handleNavigation('/profile?tab=avatar')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted transition-colors"
        >
          <Palette className="h-6 w-6" />
          <span className="text-lg font-medium">Avatar</span>
        </button>

        <button
          onClick={() => handleNavigation('/profile?tab=verify')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted transition-colors"
        >
          <Shield className="h-6 w-6" />
          <span className="text-lg font-medium">Verify</span>
        </button>

        <div className="border-t border-border my-4" />

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-destructive/10 transition-colors text-destructive"
        >
          <LogOut className="h-6 w-6" />
          <span className="text-lg font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}