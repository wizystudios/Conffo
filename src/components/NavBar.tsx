import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Sun, Moon, Home, Hash, TrendingUp, Settings, LogIn, Sparkles, PlusSquare, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UsernameDisplay } from "@/components/UsernameDisplay";
import { useTheme } from "@/context/ThemeContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export function NavBar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  
  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  useEffect(() => {
    setShowNotificationBadge(notifications.length > 0);
  }, [notifications]);
  
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
    if (!user?.id || notifications.length === 0) return;
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
      
    setShowNotificationBadge(false);
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
          <Sparkles className="h-5 w-5 text-primary" />
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="relative"
                  >
                    <Bell className="h-5 w-5" />
                    {showNotificationBadge && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center">
                        {notifications.length > 9 ? '9+' : notifications.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 max-h-[70vh] overflow-y-auto">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Notifications</h3>
                      {notifications.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleMarkNotificationsAsRead}
                        >
                          Mark all as read
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="divide-y">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div key={notification.id} className="p-4 hover:bg-muted/50">
                          <p className="text-sm">{notification.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">No new notifications</p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button 
                onClick={handleCreateNew} 
                variant="outline"
                className="bg-primary/10 hover:bg-primary/20 text-primary"
                size="icon"
                aria-label="Create new post"
              >
                <PlusSquare className="h-5 w-5" />
              </Button>
            </>
          )}
          
          {isAuthenticated ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" className="gap-2">
                  {user?.avatarUrl ? (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatarUrl} alt={user?.username || "User"} />
                      <AvatarFallback>{user?.username?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Settings className="h-5 w-5" />
                  )}
                  <span className="hidden sm:inline">{user?.username || "Profile"}</span>
                </Button>
              </Link>
              
              <Button variant="outline" onClick={logout}>
                <LogIn className="h-5 w-5 mr-1" />
                <span>Logout</span>
              </Button>
            </>
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
              <Button 
                onClick={handleCreateNew} 
                variant="outline"
                className="bg-primary/10 hover:bg-primary/20 text-primary"
                size="icon"
                aria-label="Create new post"
              >
                <PlusSquare className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {
                  // Handle mobile notifications
                }}
              >
                <Bell className="h-5 w-5" />
                {showNotificationBadge && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </Badge>
                )}
              </Button>
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
