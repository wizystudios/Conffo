import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, BellDot, Check, Trash2, Sun, Moon, User, Heart, Bookmark, Settings, LogOut, Shield, Palette } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UsernameDisplay } from "@/components/UsernameDisplay";
import { useTheme } from "@/context/ThemeContext";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { markAllNotificationsAsRead, getUserNotifications, deleteNotification, getNotificationSender } from "@/utils/notificationUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { useScrollNavbar } from "@/hooks/useScrollNavbar";
import { haptic } from "@/utils/hapticFeedback";

export function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const isNavbarVisible = useScrollNavbar();
  
  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const notifs = await getUserNotifications(user.id, false);
      
      const enhancedNotifs = await Promise.all(notifs.map(async (notification) => {
        const senderInfo = await getNotificationSender(notification);
        return {
          ...notification,
          senderInfo
        };
      }));
      
      return enhancedNotifs;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
  
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;
  
  useEffect(() => {
    setShowNotificationBadge(unreadNotificationsCount > 0);
  }, [unreadNotificationsCount]);
  
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        refetchNotifications();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchNotifications]);
  
  const handleMarkNotificationsAsRead = async () => {
    if (!user?.id || unreadNotificationsCount === 0) return;
    
    await markAllNotificationsAsRead(user.id);
    toast({ description: "All notifications marked as read" });
    refetchNotifications();
  };

  const handleDeleteAllNotifications = async () => {
    if (!user?.id || notifications.length === 0) return;
    
    for (const notification of notifications) {
      await deleteNotification(notification.id);
    }
    
    toast({ description: "All notifications cleared" });
    refetchNotifications();
  };

  const handleLogout = async () => {
    haptic.medium();
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out successfully" });
      navigate('/auth');
    } catch (error) {
      toast({ title: "Error", description: "Failed to log out", variant: "destructive" });
    }
  };

  const handleNavigation = (path: string) => {
    haptic.light();
    navigate(path);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  return (
    <div className={`bg-background fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${isNavbarVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto flex justify-between items-center px-3 py-2">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img 
            src="/lovable-uploads/ce53fd65-dc4f-4335-984b-567f5fbae96d.png" 
            alt="Logo" 
            className="h-7 w-7 object-contain block dark:hidden"
          />
          <img 
            src="/lovable-uploads/d4fd9efb-43e0-4330-ab14-b265b0098be2.png" 
            alt="Logo" 
            className="h-7 w-7 object-contain hidden dark:block"
          />
        </Link>
        
        {/* Right side - Notifications and Menu */}
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  {showNotificationBadge ? (
                    <>
                      <BellDot className="h-5 w-5" />
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-primary text-[10px]">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </Badge>
                    </>
                  ) : (
                    <Bell className="h-5 w-5" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[85vw] max-w-sm p-0 max-h-[70vh] overflow-y-auto rounded-t-2xl" align="end">
                <div className="p-3 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-sm">Notifications</h3>
                    <div className="flex items-center gap-1">
                      {notifications.length > 0 && (
                        <>
                          {unreadNotificationsCount > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleMarkNotificationsAsRead}
                              className="h-7 px-2 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Read
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleDeleteAllNotifications}
                            className="h-7 px-2 text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="divide-y">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 10).map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-3 hover:bg-muted/50 ${!notification.is_read ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex gap-2">
                          <div className="flex-1">
                            {notification.senderInfo?.username && (
                              <div className="mb-1">
                                <UsernameDisplay
                                  userId={notification.senderInfo.userId}
                                  showAvatar={true}
                                  size="sm"
                                />
                              </div>
                            )}
                            <p className="text-xs break-words">
                              {notification.content.replace('Someone', notification.senderInfo?.username || 'Someone')}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                              {!notification.is_read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">No notifications</p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Menu Dropdown */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                <DropdownMenuItem onClick={() => handleNavigation('/profile')} className="rounded-xl py-3">
                  <User className="h-4 w-4 mr-3" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigation(`/user/${user?.id}?tab=liked`)} className="rounded-xl py-3">
                  <Heart className="h-4 w-4 mr-3" />
                  Liked
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigation('/notifications')} className="rounded-xl py-3">
                  <Bell className="h-4 w-4 mr-3" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigation(`/user/${user?.id}?tab=saved`)} className="rounded-xl py-3">
                  <Bookmark className="h-4 w-4 mr-3" />
                  Saved
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={toggleTheme} className="rounded-xl py-3">
                  {theme === 'dark' ? <Sun className="h-4 w-4 mr-3" /> : <Moon className="h-4 w-4 mr-3" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigation('/profile?tab=settings')} className="rounded-xl py-3">
                  <Settings className="h-4 w-4 mr-3" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigation('/profile?tab=avatar')} className="rounded-xl py-3">
                  <Palette className="h-4 w-4 mr-3" />
                  Avatar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigation('/profile?tab=verify')} className="rounded-xl py-3">
                  <Shield className="h-4 w-4 mr-3" />
                  Verify
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl py-3 text-destructive">
                  <LogOut className="h-4 w-4 mr-3" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
