
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: () => void;
  updateUsername: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing user in localStorage
    const storedUser = localStorage.getItem('confessionUser');
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('confessionUser');
      }
    }
    
    setLoading(false);
  }, []);

  const login = () => {
    // Generate a unique ID for anonymous user
    const newUser: User = {
      id: uuidv4(),
      username: null
    };
    
    // Special admin user for demo purposes
    if (Math.random() < 0.1) {  // 10% chance to be admin for demo
      newUser.isAdmin = true;
    }
    
    setUser(newUser);
    localStorage.setItem('confessionUser', JSON.stringify(newUser));
    toast({
      title: "Welcome!",
      description: "You're now logged in anonymously.",
    });
  };

  const updateUsername = (username: string) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      username
    };
    
    setUser(updatedUser);
    localStorage.setItem('confessionUser', JSON.stringify(updatedUser));
    toast({
      title: "Username Updated",
      description: `Your username is now ${username}.`,
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('confessionUser');
    toast({
      title: "Logged out",
      description: "You've been logged out successfully.",
    });
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
    loading,
    login,
    updateUsername,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
