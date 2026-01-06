import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, BellDot, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getUserNotifications } from "@/utils/notificationUtils";
import { useScrollNavbar } from "@/hooks/useScrollNavbar";
import { haptic } from "@/utils/hapticFeedback";
import { FullPageMenu } from "@/components/FullPageMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavBar() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isNavbarVisible = useScrollNavbar();
  
  // Fetch notifications count only
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getUserNotifications(user.id, false);
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
  
  const unreadNotificationsCount = notifications.filter((n: any) => !n.is_read).length;
  
  useEffect(() => {
    setShowNotificationBadge(unreadNotificationsCount > 0);
  }, [unreadNotificationsCount]);

  const handleMenuToggle = () => {
    haptic.light();
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <div className={`bg-background fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${isNavbarVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto flex justify-between items-center px-3 py-2">
        {/* Left spacer */}
        <div className="w-9" />
        
        {/* Center Logo with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
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
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[120px]">
            <DropdownMenuItem className="justify-center font-bold text-lg">
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                ✨ 2026 ✨
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Right side - Notifications and Menu */}
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-9 w-9"
              onClick={() => navigate('/notifications')}
            >
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
          )}
          
          {/* Menu Button */}
          {isAuthenticated ? (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleMenuToggle}>
              <ChevronDown className="h-5 w-5" />
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
      
      {/* Full Page Menu */}
      <FullPageMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
