
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Sun, Moon, Home, Hash, TrendingUp, Settings, LogIn, Sparkles, PlusSquare, Bell, BellDot, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UsernameDisplay } from "@/components/UsernameDisplay";
import { useTheme } from "@/context/ThemeContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { markAllNotificationsAsRead, getUserNotifications, deleteNotification, getNotificationSender } from "@/utils/notificationUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow } from "date-fns";

export function NavBar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const notificationPopoverRef = useRef(null);
  const [notificationPopoverOpen, setNotificationPopoverOpen] = useState(false);
  
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
    <div className="bg-background/95 backdrop-blur supports-backdrop-blur:bg-background/60 fixed top-0 left-0 right-0 border-b z-40 shadow-sm">
      <div className="container mx-auto flex justify-between items-center px-4 py-3">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xl font-semibold"
          onClick={() => setOpen(false)}
        >
          <img 
            src="/lovable-uploads/d4fd9efb-43e0-4330-ab14-b265b0098be2.png" 
            alt="Conffo" 
            className="h-8 w-8 object-contain"
          />
          <span>Conffo</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-1">
          <Link to="/">
            <Button variant={isActive('/') ? "default" : "ghost"}>
              <Home className="h-5 w-5 mr-1" />
              <span>Home</span>
            </Button>
          </Link>
          
          <Link to="/rooms">
            <Button variant={isActive('/rooms') ? "default" : "ghost"}>
              <Hash className="h-5 w-5 mr-1" />
              <span>Rooms</span>
            </Button>
          </Link>
          
          <Link to="/trending">
            <Button variant={isActive('/trending') ? "default" : "ghost"}>
              <TrendingUp className="h-5 w-5 mr-1" />
              <span>Trending</span>
            </Button>
          </Link>
          
          <Link to="/stories">
            <Button variant={isActive('/stories') ? "default" : "ghost"}>
              <Sparkles className="h-5 w-5 mr-1" />
              <span>Stories</span>
            </Button>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated && (
            <>
              <Popover open={notificationPopoverOpen} onOpenChange={setNotificationPopoverOpen}>
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
                <PopoverContent ref={notificationPopoverRef} className="w-80 p-0 max-h-[70vh] overflow-y-auto">
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
                    
                    {selectedNotifications.length > 0 && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          {selectedNotifications.length} selected
                        </span>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={handleDeleteSelectedNotifications}
                          className="h-7 text-xs"
                        >
                          Delete selected
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="divide-y">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-4 hover:bg-muted/50 relative ${!notification.is_read ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 pt-1">
                              <Checkbox 
                                checked={selectedNotifications.includes(notification.id)}
                                onCheckedChange={() => toggleNotificationSelection(notification.id)}
                              />
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-grow min-w-0">
                                  {notification.senderInfo?.username && (
                                    <div className="mb-2">
                                      <UsernameDisplay
                                        userId={notification.senderInfo.userId}
                                        showAvatar={true}
                                        size="sm"
                                      />
                                    </div>
                                  )}
                                  <p className="text-sm break-words line-clamp-3">
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
              
              <Button 
                onClick={handleCreateNew} 
                variant="outline"
                className="bg-primary/10 hover:bg-primary/20 text-primary"
                size="sm"
                aria-label="Create new post"
              >
                <PlusSquare className="h-4 w-4 mr-1.5" />
                <span>New</span>
              </Button>
            </>
          )}
          
          {isAuthenticated && user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.avatarUrl || ""} alt={user?.username || "User"} />
                    <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user?.username || "Profile"}</span>
                </Button>
              </Link>
              
              <Button variant="outline" onClick={logout}>
                <LogIn className="h-5 w-5 mr-1" />
                <span>Logout</span>
              </Button>
            </>
          ) : isAuthenticated ? (
            <Link to="/profile">
              <Button variant="ghost" className="gap-2">
                <Settings className="h-5 w-5" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="default">
                <LogIn className="h-5 w-5 mr-1" />
                <span>Sign In</span>
              </Button>
            </Link>
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
                
                <div className="mt-6 pt-6 border-t">
                  <Button 
                    onClick={() => {
                      handleCreateNew();
                      setOpen(false);
                    }} 
                    variant="outline"
                    className="w-full justify-center bg-primary/10 hover:bg-primary/20 text-primary"
                  >
                    <PlusSquare className="h-5 w-5 mr-2" />
                    <span>Create New Post</span>
                  </Button>
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
