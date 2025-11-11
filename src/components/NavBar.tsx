
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Sun, Moon, Home, Hash, TrendingUp, Settings, LogIn, Sparkles, PlusSquare, Bell, BellDot, Check, Trash2, ChevronDown, Plus, Clock, Search, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UsernameDisplay } from "@/components/UsernameDisplay";
import { useTheme } from "@/context/ThemeContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { markAllNotificationsAsRead, getUserNotifications, deleteNotification, getNotificationSender } from "@/utils/notificationUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow } from "date-fns";
import { useScrollNavbar } from "@/hooks/useScrollNavbar";
import { ProfileMenuSheet } from "@/components/ProfileMenuSheet";

export function NavBar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const notificationPopoverRef = useRef(null);
  const [notificationPopoverOpen, setNotificationPopoverOpen] = useState(false);
  const isNavbarVisible = useScrollNavbar();
  
  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const notifs = await getUserNotifications(user.id, false);
      
      // Enhance with sender info if available
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
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;
  
  useEffect(() => {
    setShowNotificationBadge(unreadNotificationsCount > 0);
  }, [unreadNotificationsCount]);
  
  // Set up realtime subscription for new notifications
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
  
  const handleMarkNotificationsAsRead = async () => {
    if (!user?.id || unreadNotificationsCount === 0) return;
    
    await markAllNotificationsAsRead(user.id);
    toast({
      description: "All notifications marked as read"
    });
    
    refetchNotifications();
  };

  const handleDeleteSelectedNotifications = async () => {
    if (selectedNotifications.length === 0) return;
    
    for (const notificationId of selectedNotifications) {
      await deleteNotification(notificationId);
    }
    
    toast({
      description: `Deleted ${selectedNotifications.length} notification${selectedNotifications.length > 1 ? 's' : ''}`
    });
    
    setSelectedNotifications([]);
    refetchNotifications();
  };

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(notifId => notifId !== id)
        : [...prev, id]
    );
  };
  
  const handleDeleteAllNotifications = async () => {
    if (!user?.id || notifications.length === 0) return;
    
    for (const notification of notifications) {
      await deleteNotification(notification.id);
    }
    
    toast({
      description: "All notifications cleared"
    });
    
    refetchNotifications();
  };
  
  return (
    <div className={`bg-background fixed top-0 left-0 right-0 border-b z-40 transition-transform duration-300 ${isNavbarVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto flex justify-between items-center px-2 py-1.5">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xl font-semibold"
          onClick={() => setOpen(false)}
        >
          <img 
            src="/lovable-uploads/ce53fd65-dc4f-4335-984b-567f5fbae96d.png" 
            alt="Logo" 
            className="h-6 w-6 object-contain block dark:hidden"
          />
          <img 
            src="/lovable-uploads/d4fd9efb-43e0-4330-ab14-b265b0098be2.png" 
            alt="Logo" 
            className="h-6 w-6 object-contain hidden dark:block"
          />
        </Link>
        
        <div className="hidden md:flex items-center space-x-0.5">
          <Link to="/">
            <Button variant={isActive('/') ? "default" : "ghost"} size="icon" className="h-7 w-7">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          
          <Link to="/search">
            <Button variant={isActive('/search') ? "default" : "ghost"} size="icon" className="h-7 w-7">
              <Search className="h-4 w-4" />
            </Button>
          </Link>
          
          {isAuthenticated && (
            <Link to="/chat">
              <Button variant={isActive('/chat') ? "default" : "ghost"} size="icon" className="h-7 w-7">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
        
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated && (
            <>
              <Link to="/notifications">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative"
                >
                  {showNotificationBadge ? (
                    <>
                      <BellDot className="h-5 w-5" />
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-primary">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </Badge>
                    </>
                  ) : (
                    <Bell className="h-5 w-5" />
                  )}
                </Button>
              </Link>
              
              <Button 
                onClick={handleCreateNew} 
                variant="outline"
                className="bg-primary/10 hover:bg-primary/20 text-primary"
                size="sm"
                aria-label="Create new post"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span>New</span>
              </Button>
            </>
          )}
          
          {isAuthenticated && user ? (
            <ProfileMenuSheet>
              <Button variant="ghost" className="gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || ""} alt={user?.username || "User"} />
                  <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </ProfileMenuSheet>
          ) : isAuthenticated ? (
            <Link to="/profile">
              <Button variant="ghost" className="gap-2">
                <Settings className="h-5 w-5" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
          ) : (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <div className="flex flex-col h-full p-4 gap-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="font-semibold text-sm">Welcome to Conffo</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <Link to="/" className="block">
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <Home className="h-4 w-4" />
                        Home
                      </Button>
                    </Link>
                    
                    <Link to="/trending" className="block">
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Trending
                      </Button>
                    </Link>
                    
                    <Link to="/search" className="block">
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <Search className="h-4 w-4" />
                        Search
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="mt-auto space-y-2 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      Sign in to unlock all features
                    </p>
                    <Link to="/auth" className="block">
                      <Button variant="default" className="w-full" size="sm">
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        <div className="md:hidden flex items-center gap-2">
          {isAuthenticated && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                  >
                    {showNotificationBadge ? (
                      <>
                        <BellDot className="h-5 w-5" />
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-primary">
                          {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                        </Badge>
                      </>
                    ) : (
                      <Bell className="h-5 w-5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[80vw] p-0 max-h-[70vh] overflow-y-auto">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Notifications</h3>
                      <div className="flex items-center gap-1">
                        {notifications.length > 0 && (
                          <>
                            {unreadNotificationsCount > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleMarkNotificationsAsRead}
                                className="h-8 px-2 text-xs"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Mark all read
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleDeleteAllNotifications}
                              className="h-8 px-2 text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Clear all
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-4 hover:bg-muted/50 ${!notification.is_read ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex gap-3">
                            <Checkbox
                              checked={selectedNotifications.includes(notification.id)}
                              onCheckedChange={() => toggleNotificationSelection(notification.id)}
                            />
                            <div>
                              {notification.senderInfo?.username && (
                                <div className="mb-2">
                                  <UsernameDisplay
                                    userId={notification.senderInfo.userId}
                                    showAvatar={true}
                                    size="sm"
                                  />
                                </div>
                              )}
                              <p className="text-sm break-words">
                                {notification.content.replace('Someone', notification.senderInfo?.username || 'Someone')}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </p>
                                {!notification.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">No notifications</p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
          
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[80vw]">
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-8">
                  <Link 
                    to="/" 
                    className="flex items-center gap-2 text-xl font-semibold"
                    onClick={() => setOpen(false)}
                  >
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>Conffo</span>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {isAuthenticated && user && (
                  <div className="mb-6 flex items-center">
                    <UsernameDisplay 
                      userId={user.id}
                      showAvatar={true}
                      size="lg"
                      linkToProfile={true}
                    />
                  </div>
                )}
                
                <div className="space-y-4">
                  <Link to="/" onClick={() => setOpen(false)}>
                    <Button 
                      variant={isActive('/') ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Home className="h-5 w-5 mr-2" />
                      <span>Home</span>
                    </Button>
                  </Link>
                  
                  <Link to="/rooms" onClick={() => setOpen(false)}>
                    <Button 
                      variant={isActive('/rooms') ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Hash className="h-5 w-5 mr-2" />
                      <span>Rooms</span>
                    </Button>
                  </Link>
                  
                  <Link to="/trending" onClick={() => setOpen(false)}>
                    <Button 
                      variant={isActive('/trending') ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <TrendingUp className="h-5 w-5 mr-2" />
                      <span>Trending</span>
                    </Button>
                  </Link>
                  
                  <Link to="/stories" onClick={() => setOpen(false)}>
                    <Button 
                      variant={isActive('/stories') ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      <span>Stories</span>
                    </Button>
                  </Link>
                </div>
                
                
                <div className="mt-auto space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                    }}
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-5 w-5 mr-2" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-5 w-5 mr-2" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </Button>
                  
                  {isAuthenticated ? (
                    <>
                      <Link to="/profile" onClick={() => setOpen(false)}>
                        <Button 
                          variant="outline" 
                          className="w-full justify-center"
                        >
                          <Settings className="h-5 w-5 mr-2" />
                          <span>Profile & Settings</span>
                        </Button>
                      </Link>
                      
                      <Button 
                        variant="default"
                        className="w-full justify-center"
                        onClick={() => {
                          logout();
                          setOpen(false);
                        }}
                      >
                        <LogIn className="h-5 w-5 mr-2" />
                        <span>Logout</span>
                      </Button>
                    </>
                  ) : (
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      <Button 
                        variant="default" 
                        className="w-full justify-center"
                      >
                        <LogIn className="h-5 w-5 mr-2" />
                        <span>Sign In</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
