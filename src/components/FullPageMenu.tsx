import { useNavigate } from "react-router-dom";
import {
  User,
  Bell,
  Sun,
  Moon,
  Settings,
  LogOut,
  Palette,
  Ban
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/utils/hapticFeedback";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl px-0 pb-safe"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-1 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        <SheetHeader className="px-6 pb-4">
          <SheetTitle className="text-xl font-bold text-left">Menu</SheetTitle>
        </SheetHeader>

        {/* Menu items */}
        <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: 'calc(85vh - 100px)' }}>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigation('/profile')}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <span className="text-base font-medium">Profile</span>
            </button>

            <button
              onClick={() => handleNavigation('/notifications')}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-11 w-11 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-base font-medium">Notifications</span>
            </button>

            <button
              onClick={() => handleNavigation('/blocked')}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center">
                <Ban className="h-5 w-5" />
              </div>
              <span className="text-base font-medium">Blocked Users</span>
            </button>

            <button
              onClick={() => handleNavigation('/blocked')}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center">
                <Ban className="h-5 w-5" />
              </div>
              <span className="text-base font-medium">Blocked Users</span>
            </button>

            <div className="h-px bg-border my-3" />

            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-11 w-11 rounded-full bg-purple-500/10 flex items-center justify-center">
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-purple-500" />
                )}
              </div>
              <span className="text-base font-medium">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            <button
              onClick={() => handleNavigation('/profile?tab=settings')}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
            >
              <div className="h-11 w-11 rounded-full bg-gray-500/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-gray-500" />
              </div>
              <span className="text-base font-medium">Settings</span>
            </button>


            <div className="h-px bg-border my-3" />

            <div className="h-px bg-border my-3" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-destructive/10 active:scale-[0.98] transition-all"
            >
              <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-base font-medium text-destructive">Logout</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}