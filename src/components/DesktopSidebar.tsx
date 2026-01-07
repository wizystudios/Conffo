import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, PlusCircle, Bell, User, MessageCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import wetechLogo from '@/assets/wetech-logo.png';

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Confessions' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/chat', icon: MessageCircle, label: 'Messages' },
    { path: '/notifications', icon: Bell, label: 'Notification', badge: unreadCount },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-background via-background to-muted/20 border-r border-border/50 flex flex-col">
      {/* Header with Logo - Unique Conffo branding */}
      <div className="p-6 pb-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all">
            <span className="text-primary-foreground font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Conffo</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Share Anonymously</p>
          </div>
        </Link>
      </div>

      {/* Create Post Button - Prominent */}
      <div className="px-4 pb-4">
        <Link to="/create-post">
          <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 font-semibold text-base gap-2">
            <PlusCircle className="h-5 w-5" />
            Create Post
          </Button>
        </Link>
      </div>

      {/* Main Navigation - Clean vertical list */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}
              <div className="relative">
                <item.icon className={`h-6 w-6 ${isActive ? 'text-primary' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[11px] font-medium flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Me Section */}
      <div className="px-3 py-4 space-y-1 border-t border-border/50">
        {isAuthenticated && profile && (
          <Link
            to={`/user/${user?.id}`}
            className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
              location.pathname.startsWith('/user/') && location.pathname.includes(user?.id || '')
                ? 'bg-primary/10 text-primary' 
                : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-sm font-medium">Me</span>
          </Link>
        )}
      </div>

      {/* User Card at Bottom */}
      {isAuthenticated && profile && (
        <div className="p-4 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 ring-2 ring-primary/20">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {profile.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{profile.username || 'User'}</p>
              <p className="text-xs text-muted-foreground">@{profile.username?.toLowerCase() || 'user'}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* WeTech Branding */}
      <div className="p-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
        <span>Powered by</span>
        <img src={wetechLogo} alt="WeTech" className="h-3.5 opacity-60" />
      </div>
    </div>
  );
}
