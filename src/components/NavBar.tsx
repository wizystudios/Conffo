import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getUserNotifications } from "@/utils/notificationUtils";
import { useScrollNavbar } from "@/hooks/useScrollNavbar";
import { haptic } from "@/utils/hapticFeedback";
import { FullPageMenu } from "@/components/FullPageMenu";

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
        {/* Left side - Notifications (only when authenticated) */}
        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9"
                onClick={() => navigate('/notifications')}
              >
                {showNotificationBadge ? (
                  <>
                    <Bell className="h-5 w-5" />
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-primary text-[10px]">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </Badge>
                  </>
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </Button>
            </>
          ) : (
            <div className="w-9" /> 
          )}
        </div>
        
        {/* Center spacer */}
        <div className="flex-1" />
        
        {/* Center - Logo */}
        <span className="text-xl font-bold tracking-tight absolute left-1/2 -translate-x-1/2">Conffo</span>
        
        {/* Right side - Menu Button (only when authenticated) */}
        {isAuthenticated && (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleMenuToggle}>
            <ChevronDown className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      {/* Full Page Menu */}
      <FullPageMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
