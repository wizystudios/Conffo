import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Home, 
  Search, 
  MessageCircle, 
  Bell, 
  User, 
  LogOut,
  Sun,
  BookMarked,
  Heart
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/utils/hapticFeedback';

interface ProfileMenuSheetProps {
  children: React.ReactNode;
}

export function ProfileMenuSheet({ children }: ProfileMenuSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    haptic.medium();
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out successfully",
      });
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: MessageCircle, label: 'Messages', path: '/chat' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: User, label: 'My Profile', path: '/profile' },
    { icon: BookMarked, label: 'Saved Posts', path: `/user/${user?.id}?tab=saved` },
    { icon: Heart, label: 'Liked Posts', path: `/user/${user?.id}?tab=liked` },
  ];

  const handleNavigation = (path: string) => {
    haptic.light();
    navigate(path);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-4 pt-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatarUrl || ''} />
              <AvatarFallback className="text-lg">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">@{user?.username || 'User'}</SheetTitle>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-base"
              onClick={() => handleNavigation(item.path)}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Button>
          ))}

          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5" />
              <span className="text-base">Theme</span>
            </div>
            <ThemeToggle />
          </div>

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
