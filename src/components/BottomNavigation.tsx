import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, LogIn, Plus, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

export function BottomNavigation() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCounts } = useUnreadMessages();
  
  const isActive = (path: string) => location.pathname === path;
  
  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  const handleCreateNew = () => {
    if (location.pathname === '/stories') {
      window.dispatchEvent(new CustomEvent('create-story'));
    } else {
      navigate('/create-post');
    }
  };
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background z-40 pb-safe">
      <div className="flex items-center justify-around py-1.5">
        <Link to="/" className="flex flex-col items-center py-1 px-3">
          <Home className={`h-5 w-5 ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`} />
        </Link>
        
        <Link to="/search" className="flex flex-col items-center py-1 px-3">
          <Search className={`h-5 w-5 ${isActive('/search') ? 'text-primary' : 'text-muted-foreground'}`} />
        </Link>
        
        {isAuthenticated && (
          <Button 
            onClick={handleCreateNew} 
            className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg -mt-4"
          >
            <Plus className="h-6 w-6 text-primary-foreground" />
          </Button>
        )}
        
        {isAuthenticated && (
          <Link to="/chat" className="flex flex-col items-center py-1 px-3 relative">
            <MessageCircle className={`h-5 w-5 ${isActive('/chat') ? 'text-primary' : 'text-muted-foreground'}`} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </Link>
        )}
        
        {isAuthenticated && user ? (
          <button onClick={() => navigate('/profile')} className="flex flex-col items-center py-1 px-3">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatarUrl || ""} />
              <AvatarFallback className="text-xs">{user?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <Link to="/auth" className="flex flex-col items-center py-1 px-3">
            <LogIn className="h-5 w-5 text-muted-foreground" />
          </Link>
        )}
      </div>
    </div>
  );
}