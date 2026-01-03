
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WifiOff, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { offlineQueue } from '@/utils/offlineQueue';

export function Footer() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setPendingCount(offlineQueue.getPendingCount());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <footer className="border-t bg-background/95 backdrop-blur mt-auto pb-16 md:pb-0">
      {!isOnline && (
        <div className="bg-destructive/10 border-b border-destructive/20 py-1 px-3">
          <div className="flex items-center justify-center gap-2 text-xs text-destructive">
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
            {pendingCount > 0 && (
              <>
                <Upload className="h-3 w-3 ml-2" />
                <span>{pendingCount} pending</span>
              </>
            )}
          </div>
        </div>
      )}
      <div className="container max-w-screen-lg py-3 sm:py-4 px-2 sm:px-4">
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <div className="flex flex-col sm:flex-row items-center sm:space-x-4 mb-2 gap-2">
            <Link to="/terms" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </div>
          
          <div className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/911a3176-bd7a-4c2f-8145-9fb902754993.png" 
              alt="Conffo" 
              className="h-6 w-6 sm:h-8 sm:w-8 object-contain filter brightness-100 dark:brightness-0 dark:invert"
            />
            <span className="text-sm sm:text-base font-medium">Conffo</span>
            <span className="text-xs text-muted-foreground">from</span>
            <div className="flex items-center">
              <Avatar className="h-6 w-6 sm:h-8 sm:w-8 rounded-full overflow-hidden">
                <AvatarImage 
                  src="/lovable-uploads/5affd7c4-65bb-4b3a-af86-0cf0b47b138f.png" 
                  alt="Wetech" 
                  className="rounded-full h-full w-full object-cover"
                />
                <AvatarFallback>WT</AvatarFallback>
              </Avatar>
              <span className="ml-1 text-sm sm:text-base font-medium">Wetech</span>
            </div>
          </div>
          
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Conffo
          </span>
        </div>
      </div>
    </footer>
  );
}
