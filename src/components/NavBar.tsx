
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
import { useIsMobile } from '@/hooks/use-mobile';

export function NavBar() {
  const { user, isAuthenticated, isAdmin, login, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
      <div className="container flex h-14 sm:h-16 max-w-screen-lg items-center px-2 sm:px-4">
        <Link to="/" className="flex items-center mr-2 sm:mr-4">
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 mr-1 sm:mr-2 bg-primary/10">
            <AvatarImage src="" alt="ConfessZone" />
            <AvatarFallback><MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></AvatarFallback>
          </Avatar>
          <span className="font-bold text-lg sm:text-xl hidden xs:block">ConfessZone</span>
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
        
        <div className="flex flex-1 items-center justify-end space-x-1 sm:space-x-2">
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>
              )}
              <Link to="/">
                <Button variant="ghost" size="icon" className="bg-primary/10 text-primary h-8 w-8 sm:h-9 sm:w-9">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                  <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${user?.id}`} />
                      <AvatarFallback>{getInitials(username || 'A')}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
              <Button variant="ghost" onClick={handleLoginClick} className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                <LogIn className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Sign In
              </Button>
              <Button onClick={handleLoginClick} className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">Register</Button>
            </>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 sm:h-9 sm:w-9">
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-3/4 max-w-xs">
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2 bg-primary/10">
                      <AvatarImage src="" alt="ConfessZone" />
                      <AvatarFallback><MessageSquare className="h-5 w-5 text-primary" /></AvatarFallback>
                    </Avatar>
                    <span className="font-bold">ConfessZone</span>
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
