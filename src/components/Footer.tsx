
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur mt-auto">
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
            <Avatar className="h-6 w-6 sm:h-8 sm:w-8 bg-primary/10">
              <AvatarFallback className="bg-primary/10">
                <MessageSquare className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm sm:text-base font-medium">Conffo</span>
            <span className="text-xs text-muted-foreground">powered by</span>
            <div className="flex items-center">
              <Avatar className="h-6 w-6 sm:h-8 sm:w-8 rounded-full overflow-hidden">
                <AvatarImage 
                  src="/lovable-uploads/631c953f-60e9-4a18-bc15-d5f86cfce136.png" 
                  alt="Wizy Studio" 
                  className="rounded-full h-full w-full object-cover"
                />
                <AvatarFallback>WS</AvatarFallback>
              </Avatar>
              <span className="ml-1 text-sm sm:text-base font-medium">Wizy Studio</span>
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
