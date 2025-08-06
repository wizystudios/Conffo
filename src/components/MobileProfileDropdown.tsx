import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Plus, 
  Sparkles, 
  Hash, 
  Clock, 
  TrendingUp,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function MobileProfileDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const menuItems = [
    { to: '/profile', icon: User, label: 'Profile' },
    { 
      action: () => {
        const event = new CustomEvent('create-story');
        window.dispatchEvent(event);
        setIsOpen(false);
      }, 
      icon: Sparkles, 
      label: 'Create Story' 
    },
    { 
      action: () => {
        const event = new CustomEvent('create-confession');
        window.dispatchEvent(event);
        setIsOpen(false);
      }, 
      icon: Plus, 
      label: 'Create Post' 
    },
    { to: '/stories', icon: Sparkles, label: 'Stories' },
    { to: '/rooms', icon: Hash, label: 'Rooms' },
    { to: '/recent', icon: Clock, label: 'Recent' },
    { to: '/trending', icon: TrendingUp, label: 'Trending' },
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
      
      <SheetContent side="bottom" className="h-auto rounded-t-2xl">
        <div className="grid grid-cols-2 gap-4 py-6">
          {menuItems.map((item, index) => (
            item.to ? (
              <Link key={index} to={item.to} onClick={() => setIsOpen(false)}>
                <Button 
                  variant="ghost" 
                  className="w-full h-16 flex-col gap-2 justify-center"
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              </Link>
            ) : (
              <Button 
                key={index}
                variant="ghost" 
                className="w-full h-16 flex-col gap-2 justify-center"
                onClick={item.action}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs">{item.label}</span>
              </Button>
            )
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}