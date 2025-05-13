
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Sun, Moon, Home, Hash, Trending, Settings, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UsernameDisplay } from "@/components/UsernameDisplay";
import { useTheme } from "@/context/ThemeContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function NavBar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <div className="bg-card fixed top-0 left-0 right-0 border-b z-40">
      <div className="container mx-auto flex justify-between items-center px-4 py-3">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xl font-semibold"
          onClick={() => setOpen(false)}
        >
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Conffo</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-1">
          <Link to="/">
            <Button variant={isActive('/') ? "default" : "ghost"}>
              <Home className="h-5 w-5 mr-1" />
              <span>Home</span>
            </Button>
          </Link>
          
          <Link to="/rooms">
            <Button variant={isActive('/rooms') ? "default" : "ghost"}>
              <Hash className="h-5 w-5 mr-1" />
              <span>Rooms</span>
            </Button>
          </Link>
          
          <Link to="/trending">
            <Button variant={isActive('/trending') ? "default" : "ghost"}>
              <Trending className="h-5 w-5 mr-1" />
              <span>Trending</span>
            </Button>
          </Link>
          
          <Link to="/stories">
            <Button variant={isActive('/stories') ? "default" : "ghost"}>
              <Sparkles className="h-5 w-5 mr-1" />
              <span>Stories</span>
            </Button>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" className="gap-2">
                  {user?.avatarUrl ? (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatarUrl} alt={user?.username || "User"} />
                      <AvatarFallback>{user?.username?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Settings className="h-5 w-5" />
                  )}
                  <span className="hidden sm:inline">{user?.username || "Profile"}</span>
                </Button>
              </Link>
              
              <Button variant="outline" onClick={logout}>
                <LogIn className="h-5 w-5 mr-1" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default">
                <LogIn className="h-5 w-5 mr-1" />
                <span>Sign In</span>
              </Button>
            </Link>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        <div className="md:hidden flex">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[80vw]">
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-8">
                  <Link 
                    to="/" 
                    className="flex items-center gap-2 text-xl font-semibold"
                    onClick={() => setOpen(false)}
                  >
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>Conffo</span>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {isAuthenticated && user && (
                  <div className="mb-6 flex items-center">
                    <UsernameDisplay 
                      userId={user.id}
                      showAvatar={true}
                      size="lg"
                      linkToProfile={true}
                    />
                  </div>
                )}
                
                <div className="space-y-4">
                  <Link to="/" onClick={() => setOpen(false)}>
                    <Button 
                      variant={isActive('/') ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Home className="h-5 w-5 mr-2" />
                      <span>Home</span>
                    </Button>
                  </Link>
                  
                  <Link to="/rooms" onClick={() => setOpen(false)}>
                    <Button 
                      variant={isActive('/rooms') ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Hash className="h-5 w-5 mr-2" />
                      <span>Rooms</span>
                    </Button>
                  </Link>
                  
                  <Link to="/trending" onClick={() => setOpen(false)}>
                    <Button 
                      variant={isActive('/trending') ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Trending className="h-5 w-5 mr-2" />
                      <span>Trending</span>
                    </Button>
                  </Link>
                  
                  <Link to="/stories" onClick={() => setOpen(false)}>
                    <Button 
                      variant={isActive('/stories') ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      <span>Stories</span>
                    </Button>
                  </Link>
                </div>
                
                <div className="mt-auto space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                    }}
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-5 w-5 mr-2" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-5 w-5 mr-2" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </Button>
                  
                  {isAuthenticated ? (
                    <>
                      <Link to="/profile" onClick={() => setOpen(false)}>
                        <Button 
                          variant="outline" 
                          className="w-full justify-center"
                        >
                          <Settings className="h-5 w-5 mr-2" />
                          <span>Profile & Settings</span>
                        </Button>
                      </Link>
                      
                      <Button 
                        variant="default"
                        className="w-full justify-center"
                        onClick={() => {
                          logout();
                          setOpen(false);
                        }}
                      >
                        <LogIn className="h-5 w-5 mr-2" />
                        <span>Logout</span>
                      </Button>
                    </>
                  ) : (
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      <Button 
                        variant="default" 
                        className="w-full justify-center"
                      >
                        <LogIn className="h-5 w-5 mr-2" />
                        <span>Sign In</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
