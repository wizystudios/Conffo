import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User as UserType } from '@/types';

interface AuthContextType {
  user: UserType | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  updateUser: (username: string) => Promise<void>;
  isAdmin: boolean;
  isModerator: boolean;
  login: () => void;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  getSavedConfessions: () => Promise<string[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { user } = session;
        
        const profileData = await refreshUserProfile(user.id);
        
        if (profileData) {
          setUser({
            id: user.id,
            username: profileData.username,
            isAdmin: profileData.is_admin || false,
            isModerator: profileData.is_moderator || false,
            savedConfessions: [] // Initialize as empty array
          });
          setIsAdmin(profileData.is_admin || false);
          setIsModerator(profileData.is_moderator || false);
          setIsAuthenticated(true);
        }
      }
      setIsLoading(false);
    };
    
    loadUser();
    
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const profileData = await refreshUserProfile(session.user.id);
        
        if (profileData) {
          setUser({
            id: session.user.id,
            username: profileData.username,
            isAdmin: profileData.is_admin || false,
            isModerator: profileData.is_moderator || false,
            savedConfessions: [] // Initialize as empty array
          });
          setIsAdmin(profileData.is_admin || false);
          setIsModerator(profileData.is_moderator || false);
          setIsAuthenticated(true);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setIsModerator(false);
        setIsAuthenticated(false);
      }
    });
  }, []);
  
  const signIn = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert('Check your email for the magic link to sign in.');
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const signUp = async (email: string, password: string, username: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });
      if (error) throw error;
      
      // After successful signup, update the user's profile
      if (data.user) {
        await updateUserProfile(data.user.id, username);
        
        // Refresh the user profile to get the updated data
        await refreshUserProfile(data.user.id);
      }
      
      alert('Check your email for the verification link.');
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUser = async (username: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await updateUserProfile(user.id, username);
      
      // Refresh the user profile to get the updated data
      await refreshUserProfile(user.id);
      
      setUser({
        ...user,
        username: username,
      });
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUserProfile = async (userId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username })
        .eq('id', userId);
      
      if (error) {
        console.error('Error updating user profile:', error);
        return null;
      }
      
      return { username };
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return null;
    }
  };

  const refreshUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, is_admin, is_moderator')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      // Set user profile data safely
      setUser((prevUser) => 
        prevUser ? {
          ...prevUser,
          username: data.username,
          isAdmin: data.is_admin || false,
          isModerator: data.is_moderator || false,
          savedConfessions: [] // Initialize as empty array since it doesn't exist in DB yet
        } : null
      );

      return data;
    } catch (error) {
      console.error('Error in refreshUserProfile:', error);
      return null;
    }
  };
  
  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setIsModerator(false);
      setIsAuthenticated(false);
      navigate('/login');
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const login = () => {
    navigate('/auth');
  };
  
  const logout = async () => {
    return signOut();
  };
  
  const updateUsername = async (username: string) => {
    return updateUser(username);
  };
  
  const getSavedConfessions = async (): Promise<string[]> => {
    if (!user) return [];
    
    try {
      // Here we would fetch saved confessions from a database table
      // For now, return an empty array as this functionality isn't implemented yet
      return [];
    } catch (error) {
      console.error('Error fetching saved confessions:', error);
      return [];
    }
  };
  
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    signUp,
    updateUser,
    isAdmin,
    isModerator,
    login,
    logout,
    updateUsername,
    getSavedConfessions
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
