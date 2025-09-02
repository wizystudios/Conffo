import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, LogIn, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { MobileProfileDropdown } from '@/components/MobileProfileDropdown';

export function BottomNavigation() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const handleCreateNew = () => {
    if (location.pathname === '/stories') {
      // Trigger story creation dialog using a custom event
      const event = new CustomEvent('create-story');
      window.dispatchEvent(event);
    } else {
      // Default to confession
      const event = new CustomEvent('create-confession');
      window.dispatchEvent(event);
    }
  };
  
  const links = [
    { to: '/', icon: Home, label: 'Home' },
    ...(isAuthenticated ? [{ to: '/chat', icon: MessageCircle, label: 'Chat' }] : []),
  ];
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40 pb-safe">
      <div className="flex items-center justify-around py-3">
        {links.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex flex-col items-center py-2 px-4">
            <Icon className={`h-6 w-6 ${isActive(to) ? 'text-primary' : 'text-muted-foreground'}`} />
          </Link>
        ))}
        
        {/* Plus button for authenticated users */}
        {isAuthenticated && (
          <Button 
            onClick={handleCreateNew} 
            variant="ghost"
            size="icon"
            className="flex flex-col items-center py-2 px-4"
            aria-label="Create new post"
          >
            <Plus className="h-6 w-6 text-primary" />
          </Button>
        )}
        
        {/* Profile or Sign In */}
        {isAuthenticated && user ? (
          <MobileProfileDropdown />
        ) : (
          <Link to="/auth" className="flex flex-col items-center py-2 px-4">
            <LogIn className="h-6 w-6 text-muted-foreground" />
          </Link>
        )}
      </div>
    </div>
  );
}