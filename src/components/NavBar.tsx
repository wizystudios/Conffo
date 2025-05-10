
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, MessageSquare, Home, User, LogOut, Bell, LogIn, Save, Plus, Settings } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { rooms } from '@/services/dataService';

export function NavBar() {
  const { user, isAuthenticated, isAdmin, login, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  
  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user]);
  
  const handleLoginClick = () => {
    navigate('/auth');
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'A';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 max-w-screen-lg items-center">
        <Link to="/" className="flex items-center mr-4">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage src="/lovable-uploads/631c953f-60e9-4a18-bc15-d5f86cfce136.png" alt="Logo" />
            <AvatarFallback><MessageSquare className="h-5 w-5 text-primary" /></AvatarFallback>
          </Avatar>
          <span className="font-bold text-xl">Confession Room</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-4 ml-4">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="h-4 w-4 inline-block mr-1" />
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
          {isAuthenticated && (
            <Link 
              to="/profile" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/profile' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <User className="h-4 w-4 inline-block mr-1" />
              Profile
            </Link>
          )}
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
              <Link to="/">
                <Button variant="ghost" size="icon" className="bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="icon">
                  <Save className="h-5 w-5" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${user?.id}`} />
                      <AvatarFallback>{getInitials(username || 'A')}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="flex items-center px-2 py-2">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${user?.id}`} />
                      <AvatarFallback>{getInitials(username || 'A')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{username || 'Anonymous User'}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
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
            <>
              <Button variant="ghost" onClick={handleLoginClick}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
              <Button onClick={handleLoginClick}>Register</Button>
            </>
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
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src="/lovable-uploads/631c953f-60e9-4a18-bc15-d5f86cfce136.png" alt="Logo" />
                      <AvatarFallback><MessageSquare className="h-5 w-5 text-primary" /></AvatarFallback>
                    </Avatar>
                    <span className="font-bold">Confession Room</span>
                  </div>
                  <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </SheetClose>
                </div>

                {isAuthenticated && (
                  <div className="flex items-center mb-4 p-2 bg-muted/50 rounded-md">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${user?.id}`} />
                      <AvatarFallback>{getInitials(username || 'A')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{username || 'Anonymous User'}</p>
                      <p className="text-xs text-muted-foreground">Logged In</p>
                    </div>
                  </div>
                )}

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
                  {isAuthenticated && (
                    <SheetClose asChild>
                      <Link to="/profile" className="flex items-center py-2">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </SheetClose>
                  )}
                  {isAuthenticated && (
                    <SheetClose asChild>
                      <Link to="/profile" className="flex items-center py-2">
                        <Save className="mr-2 h-4 w-4" />
                        <span>Saved Confessions</span>
                      </Link>
                    </SheetClose>
                  )}
                  {isAuthenticated && (
                    <SheetClose asChild>
                      <Link to="/profile" className="flex items-center py-2">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </SheetClose>
                  )}
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
                  {isAuthenticated ? (
                    <>
                      {isAdmin && (
                        <SheetClose asChild>
                          <Link to="/admin" className="flex items-center py-2">
                            <Bell className="mr-2 h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </Link>
                        </SheetClose>
                      )}
                      <SheetClose asChild>
                        <Button variant="ghost" className="justify-start px-2" onClick={logout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log Out</span>
                        </Button>
                      </SheetClose>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <Link to="/auth" className="flex items-center py-2">
                        <LogIn className="mr-2 h-4 w-4" />
                        <span>Sign In / Register</span>
                      </Link>
                    </SheetClose>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
