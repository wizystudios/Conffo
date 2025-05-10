
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur mt-auto">
      <div className="container max-w-screen-lg py-6 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center space-x-2 mb-2">
            <Avatar className="h-8 w-8 rounded-full overflow-hidden">
              <AvatarImage src="/lovable-uploads/631c953f-60e9-4a18-bc15-d5f86cfce136.png" alt="Logo" />
              <AvatarFallback>CR</AvatarFallback>
            </Avatar>
            <span className="font-medium">Confession Room</span>
            <span className="text-sm text-muted-foreground">powered by</span>
            <div className="flex items-center">
              <Avatar className="h-8 w-8 rounded-full overflow-hidden">
                <AvatarImage 
                  src="/lovable-uploads/631c953f-60e9-4a18-bc15-d5f86cfce136.png" 
                  alt="Wizy Studio" 
                />
                <AvatarFallback>WS</AvatarFallback>
              </Avatar>
              <span className="ml-1 font-medium">Wizy Studio</span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </div>
          
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Confession Room
          </span>
        </div>
      </div>
    </footer>
  );
}
