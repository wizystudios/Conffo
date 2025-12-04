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
    <div className="fixed inset-0 z-50 animate-in slide-in-from-top-full duration-300">
      {/* Main content container */}
      <div 
        className="h-full bg-background flex flex-col"
        style={{ 
          borderBottomLeftRadius: '32px', 
          borderBottomRightRadius: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header with close button */}
        <div className="flex justify-between items-center p-6 pb-2">
          <h2 className="text-2xl font-bold">Menu</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-full h-12 w-12"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="space-y-1">
            <button
              onClick={() => handleNavigation('/profile')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <span className="text-lg font-medium">Profile</span>
            </button>

            <button
              onClick={() => handleNavigation(`/user/${user?.id}?tab=liked`)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-red-500" />
              </div>
              <span className="text-lg font-medium">Liked</span>
            </button>

            <button
              onClick={() => handleNavigation('/notifications')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-blue-500" />
              </div>
              <span className="text-lg font-medium">Notifications</span>
            </button>

            <button
              onClick={() => handleNavigation(`/user/${user?.id}?tab=saved`)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Bookmark className="h-6 w-6 text-yellow-500" />
              </div>
              <span className="text-lg font-medium">Saved</span>
            </button>

            <div className="h-px bg-border my-4" />

            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                {theme === 'dark' ? (
                  <Sun className="h-6 w-6 text-yellow-500" />
                ) : (
                  <Moon className="h-6 w-6 text-purple-500" />
                )}
              </div>
              <span className="text-lg font-medium">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            <button
              onClick={() => handleNavigation('/profile?tab=settings')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-gray-500/10 flex items-center justify-center">
                <Settings className="h-6 w-6 text-gray-500" />
              </div>
              <span className="text-lg font-medium">Settings</span>
            </button>

            <button
              onClick={() => handleNavigation('/profile?tab=avatar')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Palette className="h-6 w-6 text-pink-500" />
              </div>
              <span className="text-lg font-medium">Avatar</span>
            </button>

            <button
              onClick={() => handleNavigation('/profile?tab=verify')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-500" />
              </div>
              <span className="text-lg font-medium">Verify</span>
            </button>

            <div className="h-px bg-border my-4" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-destructive/10 active:scale-[0.98] transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-6 w-6 text-destructive" />
              </div>
              <span className="text-lg font-medium text-destructive">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}