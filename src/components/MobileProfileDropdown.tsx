import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Home,
  Search,
  MessageCircle,
  Bell,
  BookMarked,
  Heart,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/utils/hapticFeedback';

export function MobileProfileDropdown() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    haptic.medium();
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out successfully" });
      navigate('/auth');
    } catch (error) {
      toast({ title: "Error", description: "Failed to log out", variant: "destructive" });
    }
  };

  const handleNavigation = (path: string) => {
    haptic.light();
    navigate(path);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-1 h-auto">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.avatarUrl || ""} alt={user?.username || "User"} />
            <AvatarFallback className="text-xs">
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
        <DropdownMenuItem onClick={() => handleNavigation('/')}>
          <Home className="h-4 w-4 mr-2" />
          Home
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/search')}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/chat')}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Messages
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/notifications')}>
          <Bell className="h-4 w-4 mr-2" />
          Notifications
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleNavigation('/profile')}>
          <User className="h-4 w-4 mr-2" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation(`/user/${user?.id}?tab=saved`)}>
          <BookMarked className="h-4 w-4 mr-2" />
          Saved
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation(`/user/${user?.id}?tab=liked`)}>
          <Heart className="h-4 w-4 mr-2" />
          Liked
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
