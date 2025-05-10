
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isModerator: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  saveConfession: (confessionId: string) => Promise<void>;
  getSavedConfessions: () => Promise<string[]>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isModerator: false,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  updateUsername: async () => {},
  saveConfession: async () => {},
  getSavedConfessions: async () => [],
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedConfessions, setSavedConfessions] = useState<string[]>([]);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Check if the profile exists
      const { data, error } = await supabase
        .from('profiles')
        .select('username, is_admin, is_moderator')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return {
        id: userId,
        username: data?.username || null,
        isAdmin: data?.is_admin || false,
        isModerator: data?.is_moderator || false,
        savedConfessions: [] // We'll implement this later when DB is updated
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      
      if (error) {
        throw error;
      }
      
      // The redirect to OAuth provider will happen automatically
    } catch (error) {
      console.error('Error during login:', error);
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loginAnonymously = async () => {
    try {
      setIsLoading(true);
      
      // Generate anonymous credentials
      const randomEmail = `anonymous_${Math.random().toString(36).substring(2, 15)}@example.com`;
      const randomPassword = Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase.auth.signUp({
        email: randomEmail,
        password: randomPassword
      });
      
      if (error) {
        throw error;
      }
      
      // User will be logged in automatically after signup
    } catch (error) {
      console.error('Error during anonymous login:', error);
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      setSavedConfessions([]);
      
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: 'Logout Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUsername = async (username: string) => {
    try {
      if (!user) return;
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username, 
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) {
        throw error;
      }
      
      setUser(prev => {
        if (!prev) return null;
        return { ...prev, username };
      });
      
      toast({
        title: 'Username Updated',
        description: 'Your username has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating username:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const saveConfession = async (confessionId: string) => {
    // This will be implemented later when DB is updated
    toast({
      title: 'Feature Coming Soon',
      description: 'Saving confessions will be available soon!',
    });
  };
  
  const getSavedConfessions = async (): Promise<string[]> => {
    // This will be implemented later when DB is updated
    return [];
  };

  useEffect(() => {
    // First set up the auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Synchronously update authentication state
        setIsLoading(true);
        
        if (session) {
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(async () => {
            const userProfile = await fetchUserProfile(session.user.id);
            
            if (userProfile) {
              setUser(userProfile);
              setSavedConfessions(userProfile.savedConfessions || []);
            } else {
              // If profile doesn't exist, create it
              try {
                await supabase
                  .from('profiles')
                  .insert([{ 
                    id: session.user.id
                  }]);
                
                setUser({
                  id: session.user.id,
                  username: null,
                  isAdmin: false,
                  isModerator: false,
                  savedConfessions: []
                });
              } catch (error) {
                console.error('Error creating user profile:', error);
              }
            }
            
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setSavedConfessions([]);
          setIsLoading(false);
        }
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const userProfile = await fetchUserProfile(session.user.id);
          
          if (userProfile) {
            setUser(userProfile);
            setSavedConfessions(userProfile.savedConfessions || []);
          } else {
            // If profile doesn't exist, create it
            try {
              await supabase
                .from('profiles')
                .insert([{ 
                  id: session.user.id
                }]);
              
              setUser({
                id: session.user.id,
                username: null,
                isAdmin: false,
                isModerator: false,
                savedConfessions: []
              });
            } catch (error) {
              console.error('Error creating user profile:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.isAdmin || false,
        isModerator: user?.isModerator || false,
        isAuthenticated,
        isLoading,
        login: loginAnonymously, // Use anonymous login for simplicity
        logout,
        updateUsername,
        saveConfession,
        getSavedConfessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
