
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur mt-auto">
      <div className="container max-w-screen-lg py-4 sm:py-6 px-2 sm:px-4">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:space-x-4 mb-2 gap-3">
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </div>
          
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8 rounded-full overflow-hidden bg-primary/10">
              <AvatarImage src="" alt="ConfessZone Logo" />
              <AvatarFallback className="bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">ConfessZone</span>
            <span className="text-xs text-muted-foreground">powered by</span>
            <div className="flex items-center">
              <Avatar className="h-8 w-8 rounded-full overflow-hidden">
                <AvatarImage 
                  src="/lovable-uploads/631c953f-60e9-4a18-bc15-d5f86cfce136.png" 
                  alt="Wizy Studio" 
                  className="rounded-full h-full w-full object-cover"
                />
                <AvatarFallback>WS</AvatarFallback>
              </Avatar>
              <span className="ml-1 font-medium">Wizy Studio</span>
            </div>
          </div>
          
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ConfessZone
          </span>
        </div>
      </div>
    </footer>
  );
}
