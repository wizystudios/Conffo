import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, Users, Bell, Settings, PlusCircle, Phone, Compass } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface RailItemProps {
  to?: string;
  onClick?: () => void;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  badge?: number;
  dot?: boolean;
}

function RailItem({ to, onClick, icon: Icon, label, active, badge, dot }: RailItemProps) {
  const content = (
    <div
      className={`group relative flex items-center justify-center h-12 w-12 rounded-xl transition-colors ${
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      }`}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
      {badge && badge > 0 ? (
        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : dot ? (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
      ) : null}

      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-foreground text-background text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {label}
      </span>
    </div>
  );

  if (to) return <Link to={to} aria-label={label}>{content}</Link>;
  return <button onClick={onClick} aria-label={label}>{content}</button>;
}

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const { unreadCounts } = useUnreadMessages();
  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

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

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="fixed left-0 top-0 h-full w-[68px] bg-background border-r border-border/40 flex flex-col items-center py-3 z-40">
      {/* Top: primary nav */}
      <div className="flex flex-col items-center gap-1">
        <RailItem to="/chat" icon={MessageCircle} label="Chats" active={isActive('/chat')} badge={totalUnread} />
        <RailItem to="/" icon={Home} label="Rooms" active={location.pathname === '/'} />
        <RailItem to="/search" icon={Compass} label="Explore" active={isActive('/search')} />
        <RailItem to="/communities" icon={Users} label="Communities" active={isActive('/communities')} />
        {isAuthenticated && (
          <RailItem onClick={() => navigate('/create-post')} icon={PlusCircle} label="New Confession" />
        )}
        <RailItem
          to="/notifications"
          icon={Bell}
          label="Notifications"
          active={isActive('/notifications')}
          badge={unreadCount}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: settings + me */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-px bg-border/60 my-1" />
        <RailItem to="/settings" icon={Settings} label="Settings" active={isActive('/settings')} />
        {isAuthenticated && profile ? (
          <button
            onClick={() => navigate('/profile')}
            aria-label="Profile"
            className="group relative h-12 w-12 flex items-center justify-center"
          >
            <Avatar className={`h-9 w-9 transition ${isActive('/profile') ? 'ring-2 ring-primary' : 'ring-1 ring-border/60'}`}>
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                {profile.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-foreground text-background text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {profile.username || 'Me'}
            </span>
          </button>
        ) : (
          <RailItem to="/auth" icon={Phone} label="Sign in" />
        )}
      </div>
    </div>
  );
}
