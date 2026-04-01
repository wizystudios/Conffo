import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

export function BottomNavigation() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCounts } = useUnreadMessages();
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  const isActive = (path: string) => location.pathname === path;
  
  const handleCreateNew = () => {
    navigate('/create-post');
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/20 z-40 pb-safe">
      <div className="flex items-center justify-around py-1.5">
        {/* Home */}
        <Link to="/" className="flex flex-col items-center py-1 px-3 gap-0.5">
          <Home className={`h-[18px] w-[18px] ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={isActive('/') ? 2.5 : 1.5} />
          <span className={`text-[9px] ${isActive('/') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Rooms</span>
        </Link>
        
        {/* Explore */}
        <Link to="/search" className="flex flex-col items-center py-1 px-3 gap-0.5">
          <Search className={`h-[18px] w-[18px] ${isActive('/search') ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={isActive('/search') ? 2.5 : 1.5} />
          <span className={`text-[9px] ${isActive('/search') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Explore</span>
        </Link>
        
        {/* Confess - Center */}
        {isAuthenticated && (
          <button 
            onClick={handleCreateNew} 
            className="bg-primary h-10 w-10 rounded-full flex items-center justify-center -mt-3 shadow-md shadow-primary/20"
          >
            <Plus className="h-5 w-5 text-primary-foreground" />
          </button>
        )}
        
        {/* Chats */}
        {isAuthenticated && (
          <Link to="/chat" className="flex flex-col items-center py-1 px-3 gap-0.5 relative">
            <div className="relative">
              <MessageSquare className={`h-[18px] w-[18px] ${isActive('/chat') ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={isActive('/chat') ? 2.5 : 1.5} />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1.5 h-3.5 min-w-3.5 px-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </div>
            <span className={`text-[9px] ${isActive('/chat') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Chats</span>
          </Link>
        )}
        
        {/* Me */}
        {isAuthenticated && user ? (
          <button onClick={() => navigate('/profile')} className="flex flex-col items-center py-1 px-3 gap-0.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={user.avatarUrl || ""} />
              <AvatarFallback className="text-[8px] bg-muted">
                {user?.username?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className={`text-[9px] ${isActive('/profile') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Me</span>
          </button>
        ) : (
          <Link to="/auth" className="flex flex-col items-center py-1 px-3 gap-0.5">
            <User className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />
            <span className="text-[9px] text-muted-foreground">Sign In</span>
          </Link>
        )}
      </div>
    </div>
  );
}
