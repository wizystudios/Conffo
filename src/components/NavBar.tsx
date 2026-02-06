import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useScrollNavbar } from "@/hooks/useScrollNavbar";
import { haptic } from "@/utils/hapticFeedback";
import { FullPageMenu } from "@/components/FullPageMenu";
import { useNotifications } from "@/hooks/useNotifications";

export function NavBar() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isNavbarVisible = useScrollNavbar();
  const { unreadCount } = useNotifications();

  const handleMenuToggle = () => {
    haptic.light();
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <div className={`bg-background fixed top-0 left-0 right-0 z-40 transition-transform duration-300 border-b border-border/30 ${isNavbarVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="flex justify-between items-center px-4 py-3 max-w-lg mx-auto">
        {/* Left - Menu */}
        {isAuthenticated ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMenuToggle}>
            <Menu className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-8" />
        )}
        
        {/* Center - Logo */}
        <span className="text-lg font-bold">Conffo</span>
        
        {/* Right - Notifications */}
        {isAuthenticated ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-8 w-8"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-primary text-[10px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        ) : (
          <div className="w-8" />
        )}
      </div>
      
      {/* Full Page Menu */}
      <FullPageMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
