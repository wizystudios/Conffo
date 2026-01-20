import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

export function BottomNavigation() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCounts } = useUnreadMessages();
  
  const isActive = (path: string) => location.pathname === path;
  
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  const handleCreateNew = () => {
    if (location.pathname === '/stories') {
      window.dispatchEvent(new CustomEvent('create-story'));
    } else {
      navigate('/create-post');
    }
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home', showAlways: true },
    { path: '/search', icon: Search, label: 'Explore', authRequired: true },
  ];
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 conffo-bottom-nav z-40 pb-safe">
      <div className="flex items-center justify-around py-2">
        {/* Home */}
        <Link to="/" className="flex flex-col items-center py-1 px-3 gap-0.5">
          <Home className={`h-5 w-5 ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] ${isActive('/') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Home
          </span>
        </Link>
        
        {/* Explore */}
        <Link to="/search" className="flex flex-col items-center py-1 px-3 gap-0.5">
          <Search className={`h-5 w-5 ${isActive('/search') ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] ${isActive('/search') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Explore
          </span>
        </Link>
        
        {/* Confess - Center Button */}
        {isAuthenticated && (
          <button 
            onClick={handleCreateNew} 
            className="conffo-confess-btn h-14 w-14 rounded-full flex items-center justify-center -mt-6 shadow-lg shadow-primary/30"
          >
            <Plus className="h-7 w-7 text-white" />
          </button>
        )}
        
        {/* My Replies */}
        {isAuthenticated && (
          <Link to="/chat" className="flex flex-col items-center py-1 px-3 relative gap-0.5">
            <MessageCircle className={`h-5 w-5 ${isActive('/chat') ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-[10px] ${isActive('/chat') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              My Replies
            </span>
            {totalUnread > 0 && (
              <span className="absolute -top-1 right-0 h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </Link>
        )}
        
        {/* Me */}
        {isAuthenticated && user ? (
          <button onClick={() => navigate('/profile')} className="flex flex-col items-center py-1 px-3 gap-0.5">
            <Avatar className="h-6 w-6 border border-primary/30">
              <AvatarImage src={user.avatarUrl || ""} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-primary/10">
                {user?.username?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className={`text-[10px] ${isActive('/profile') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Me
            </span>
          </button>
        ) : (
          <Link to="/auth" className="flex flex-col items-center py-1 px-3 gap-0.5">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Sign In</span>
          </Link>
        )}
      </div>
    </div>
  );
}
