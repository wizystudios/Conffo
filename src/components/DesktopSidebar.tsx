import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, Heart, User, MessageCircle, Settings, LogOut, Bookmark, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/create-post', icon: Plus, label: 'Create' },
    { path: '/notifications', icon: Heart, label: 'Notifications', badge: unreadCount },
    { path: '/chat', icon: MessageCircle, label: 'Messages' },
    { path: user?.id ? `/user/${user.id}` : '/auth', icon: User, label: 'Profile' },
  ];

  const secondaryItems = [
    { path: '/saved', icon: Bookmark, label: 'Saved' },
    { path: '/blocked-users', icon: Users, label: 'Blocked' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-background border-r border-border flex flex-col py-6 px-4">
      {/* Logo */}
      <Link to="/" className="mb-8 px-3">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Conffo
        </h1>
      </Link>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all group hover:bg-muted ${
                isActive ? 'font-semibold' : ''
              }`}
            >
              <div className="relative">
                <item.icon className={`h-6 w-6 ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t border-border pt-4 mt-4 space-y-1">
        {secondaryItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all group hover:bg-muted ${
                isActive ? 'font-semibold' : ''
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
              <span className={`text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* User Profile Section */}
      {isAuthenticated && profile && (
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback>{profile.username?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.username || 'User'}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
