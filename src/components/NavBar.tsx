
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageSquare, Home, User, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { rooms } from '@/services/dataService';

export function NavBar() {
  const { user, isAuthenticated, isAdmin, login, logout, updateUsername } = useAuth();
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const location = useLocation();
  
  const handleSaveUsername = () => {
    if (username.trim()) {
      updateUsername(username.trim());
    }
    setUsernameDialogOpen(false);
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 max-w-screen-lg items-center">
        <Link to="/" className="flex items-center mr-4">
          <MessageSquare className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-xl">Confession Room</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-4 ml-4">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/rooms" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === '/rooms' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Rooms
          </Link>
          <Link 
            to="/trending" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === '/trending' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Trending
          </Link>
        </nav>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setUsernameDialogOpen(true)}>
                    Set Username
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={login}>Enter Anonymously</Button>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="h-6 w-6 text-primary mr-2" />
                    <span className="font-bold">Confession Room</span>
                  </div>
                  <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </SheetClose>
                </div>
                <div className="grid gap-2">
                  <SheetClose asChild>
                    <Link to="/" className="flex items-center py-2">
                      <Home className="mr-2 h-4 w-4" />
                      <span>Home</span>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/trending" className="flex items-center py-2">
                      <span>Trending Confessions</span>
                    </Link>
                  </SheetClose>
                  <div className="py-2">
                    <h4 className="mb-2 font-semibold">Rooms</h4>
                    {rooms.map((room) => (
                      <SheetClose key={room.id} asChild>
                        <Link
                          to={`/room/${room.id}`}
                          className="block py-1.5 pl-4 text-muted-foreground hover:text-primary"
                        >
                          {room.name}
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                  {isAdmin && (
                    <SheetClose asChild>
                      <Link to="/admin" className="flex items-center py-2">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </Link>
                    </SheetClose>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Username</DialogTitle>
            <DialogDescription>
              Set a username to identify yourself across the app.
              You'll still remain anonymous to other users.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUsernameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveUsername}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
