
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  isModerator: boolean;
}

interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  login: () => void;
  logout: () => void;
  updateUsername: (username: string) => Promise<void>;
  getSavedConfessions: () => Promise<string[]>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  isModerator: false,
  login: () => {},
  logout: () => {},
  updateUsername: async () => {},
  getSavedConfessions: async () => [],
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          await setUserData(session.user.id);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && event === 'SIGNED_IN') {
          await setUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    fetchSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setUserData = async (userId: string) => {
    try {
      // Try to get user profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('username, is_admin, is_moderator')
        .eq('id', userId)
        .single();

      // If profile doesn't exist, create it
      if (error && error.code === 'PGRST116') {
        await supabase
          .from('profiles')
          .insert([{ id: userId, username: null, is_admin: false, is_moderator: false }]);
      }

      // Set user data
      const userData: User = {
        id: userId,
        email: '',
        username: data?.username || null,
        isAdmin: data?.is_admin || false,
        isModerator: data?.is_moderator || false,
      };

      setUser(userData);
    } catch (error) {
      console.error('Error setting user data:', error);
    }
  };

  const login = async () => {
    try {
      // For demo purposes, create an anonymous user
      const { error } = await supabase.auth.signInAnonymously();

      if (error) throw error;

      toast({
        title: "Signed in anonymously",
        description: "You are now signed in anonymously.",
      });
    } catch (error: any) {
      console.error('Error logging in:', error);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "An error occurred during login.",
      });
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out.",
      });
      navigate('/');
    } catch (error: any) {
      console.error('Error logging out:', error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message || "An error occurred during logout.",
      });
    }
  };

  const updateUsername = async (username: string) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, username } : null);

      toast({
        title: "Username updated",
        description: "Your username has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating username:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "An error occurred while updating your username.",
      });
    }
  };

  const getSavedConfessions = async (): Promise<string[]> => {
    try {
      if (!user) return [];

      const { data, error } = await supabase
        .from('saved_confessions')
        .select('confession_id')
        .eq('user_id', user.id);

      if (error) throw error;

      return data.map(item => item.confession_id);
    } catch (error) {
      console.error('Error fetching saved confessions:', error);
      return [];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: user?.isAdmin || false,
        isModerator: user?.isModerator || false,
        login,
        logout,
        updateUsername,
        getSavedConfessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
