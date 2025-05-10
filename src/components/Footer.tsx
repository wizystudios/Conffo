
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur mt-auto">
      <div className="container max-w-screen-lg py-6 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="font-medium">Confession Room</span>
            <span className="text-sm text-muted-foreground">powered by</span>
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/631c953f-60e9-4a18-bc15-d5f86cfce136.png" 
                alt="Wizy Studio" 
                className="h-8 w-8 rounded-full object-cover"
              />
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
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Confession Room
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
