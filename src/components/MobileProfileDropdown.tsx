import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  ChevronUp
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/utils/hapticFeedback';

export function MobileProfileDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    haptic.medium();
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out successfully" });
      setIsOpen(false);
      navigate('/auth');
    } catch (error) {
      toast({ title: "Error", description: "Failed to log out", variant: "destructive" });
    }
  };

  const menuItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/chat', icon: MessageCircle, label: 'Messages' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'My Profile' },
    { to: `/user/${user?.id}?tab=saved`, icon: BookMarked, label: 'Saved' },
    { to: `/user/${user?.id}?tab=liked`, icon: Heart, label: 'Liked' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="p-2 h-auto">
          <div className="flex flex-col items-center space-y-1">
            <div className="relative">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatarUrl || ""} alt={user?.username || "User"} />
                <AvatarFallback className="text-xs">
                  {user?.username?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          </div>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        {/* User Header */}
        <div className="flex items-center gap-3 py-4 border-b mb-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={user.avatarUrl || ""} />
            <AvatarFallback className="text-lg">
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">@{user?.username || 'User'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        
        {/* Navigation Items */}
        <div className="space-y-1">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.to} onClick={() => { haptic.light(); setIsOpen(false); }}>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-12 text-base"
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Button>
            </Link>
          ))}
          
          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5" />
              <span className="text-base">Theme</span>
            </div>
            <ThemeToggle />
          </div>
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-base text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}