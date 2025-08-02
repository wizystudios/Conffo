import { Link, useLocation } from 'react-router-dom';
import { Home, Hash, TrendingUp, Sparkles, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function BottomNavigation() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/rooms', icon: Hash, label: 'Rooms' },
    { to: '/trending', icon: TrendingUp, label: 'Trending' },
    { to: '/stories', icon: Sparkles, label: 'Stories' },
  ];
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40 pb-safe">
      <div className="flex items-center justify-around py-3">
        {links.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex flex-col items-center py-2 px-4">
            <Icon className={`h-6 w-6 ${isActive(to) ? 'text-primary' : 'text-muted-foreground'}`} />
          </Link>
        ))}
        
        {isAuthenticated && (
          <Link to="/profile" className="flex flex-col items-center py-2 px-4">
            <User className={`h-6 w-6 ${isActive('/profile') ? 'text-primary' : 'text-muted-foreground'}`} />
          </Link>
        )}
      </div>
    </div>
  );
}