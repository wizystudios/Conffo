import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  updateUserProfile: (profileData: UserProfile) => Promise<boolean>;
  isAdmin: boolean;
  isModerator: boolean;
  getSavedConfessions: () => Promise<string[]>;
}

interface UserProfile {
  username?: string;
  bio?: string;
  contactEmail?: string;
  contactPhone?: string;
  avatarUrl?: string;
  isPublic?: boolean; // Added isPublic property
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const navigate = useNavigate();

  // Compute isAuthenticated from session/user
  const isAuthenticated = !!session && !!session.user;

  useEffect(() => {
    console.log("AuthProvider init");
    const setupAuth = async () => {
      setIsLoading(true);
      
      try {
        // Listen for auth state changes first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          console.log("Auth state changed:", event, "Session:", currentSession?.user?.id || "none");
          
          setSession(currentSession);
          
          if (currentSession?.user) {
            // Defer data fetching to prevent potential deadlocks
            setTimeout(async () => {
              try {
                const userData = await fetchUserData(currentSession.user.id);
                console.log("User data fetched:", userData?.username || "none");
                setUser(userData);
                setIsAdmin(userData?.isAdmin || false);
                setIsModerator(userData?.isModerator || false);
              } catch (error) {
                console.error("Error fetching user data after auth change:", error);
                // Still keep session active even if profile fetch fails
                setUser({
                  id: currentSession.user.id,
                  username: currentSession.user.email?.split('@')[0] || 'Anonymous',
                  isAdmin: false,
                  isModerator: false
                });
              }
            }, 0);
          } else {
            setUser(null);
            setIsAdmin(false);
            setIsModerator(false);
          }
        });

        // Then check for existing session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", initialSession?.user?.id || "none");
        
        setSession(initialSession);
        
        if (initialSession?.user) {
          // Defer data fetching to prevent potential deadlocks
          setTimeout(async () => {
            try {
              const userData = await fetchUserData(initialSession.user.id);
              console.log("Initial user data fetched:", userData?.username || "none");
              setUser(userData);
              setIsAdmin(userData?.isAdmin || false);
              setIsModerator(userData?.isModerator || false);
            } catch (error) {
              console.error("Error fetching initial user data:", error);
              // Still keep session active even if profile fetch fails
              setUser({
                id: initialSession.user.id,
                username: initialSession.user.email?.split('@')[0] || 'Anonymous',
                isAdmin: false,
                isModerator: false
              });
            }
          }, 0);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error in auth setup:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    setupAuth();
  }, []);

  const login = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile`
        }
      });
      
      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/profile`
        }
      });
      
      if (error) throw error;
      
      // After successful signup, create a user profile
      if (data.user) {
        await createUserProfile(data.user.id, email);
      }
      
      setSession(data);
    } catch (error) {
      console.error("Signup failed:", error);
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async () => {
    setIsLoading(true);
    try {
      console.log("Logging out...");
      // Clean up auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      setSession(null);
      setUser(null);
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUsername = async (username: string) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUser(prev => {
        if (!prev) return null;
        return { ...prev, username };
      });
    } catch (error) {
      console.error('Error updating username:', error);
    }
  };

  // Add updateUserProfile function
  const updateUserProfile = async (profileData: UserProfile) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profileData.username,
          bio: profileData.bio,
          contact_email: profileData.contactEmail,
          contact_phone: profileData.contactPhone,
          avatar_url: profileData.avatarUrl,
          is_public: profileData.isPublic, // Added is_public field
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Update local user state
      setUser(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          username: profileData.username || prev.username,
          bio: profileData.bio || prev.bio,
          contactEmail: profileData.contactEmail || prev.contactEmail,
          contactPhone: profileData.contactPhone || prev.contactPhone,
          avatarUrl: profileData.avatarUrl || prev.avatarUrl,
          isPublic: profileData.isPublic // Add isPublic to the user state update
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      console.log("Fetching user data for:", userId);
      
      // First try to get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, is_admin, is_moderator, bio, avatar_url, contact_email, contact_phone, is_public')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle missing profiles gracefully
      
      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        
        // If we can't get the profile, still return a basic user object
        return {
          id: userId,
          username: 'User',
          isAdmin: false,
          isModerator: false
        };
      }
      
      if (!profileData) {
        console.log("No profile found, creating one...");
        
        // Try to get user email for username
        const { data: userData } = await supabase.auth.getUser();
        const email = userData?.user?.email;
        const username = email ? email.split('@')[0] : 'User';
        
        // Create a profile
        try {
          await createUserProfile(userId, username);
          
          // Return a basic user object
          return {
            id: userId,
            username,
            isAdmin: false,
            isModerator: false,
            bio: null,
            avatarUrl: null,
            contactEmail: email || null,
            contactPhone: null,
            isPublic: true // Default to public profile
          };
        } catch (createError) {
          console.error("Failed to create profile:", createError);
          
          // Return basic user even if profile creation fails
          return {
            id: userId,
            username,
            isAdmin: false,
            isModerator: false
          };
        }
      }
      
      // Map profile data to user object
      return {
        id: userId,
        username: profileData.username || 'Anonymous',
        isAdmin: profileData.is_admin || false,
        isModerator: profileData.is_moderator || false,
        bio: profileData.bio || null,
        avatarUrl: profileData.avatar_url || null,
        contactEmail: profileData.contact_email || null,
        contactPhone: profileData.contact_phone || null,
        isPublic: profileData.is_public !== false // Default to true if not set
      };
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      
      // Return a fallback user object if everything fails
      return {
        id: userId,
        username: 'User',
        isAdmin: false,
        isModerator: false
      };
    }
  };
  
  const createUserProfile = async (userId: string, email: string) => {
    try {
      const username = typeof email === 'string' ? email.split('@')[0] : 'User';
      
      const { error } = await supabase
        .from('profiles')
        .insert([{ 
          id: userId, 
          username, 
          is_public: true, // Default to public profile
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error('Error creating user profile:', error);
      }
    } catch (error) {
      console.error('Error in createUserProfile:', error);
    }
  };

  const getSavedConfessions = async (): Promise<string[]> => {
    if (!user?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('saved_confessions')
        .select('confession_id')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching saved confessions:', error);
        return [];
      }
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      return data.map(item => item.confession_id);
    } catch (error) {
      console.error('Error in getSavedConfessions:', error);
      return [];
    }
  };
  
  const value = {
    user,
    session,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    updateUsername,
    updateUserProfile,
    isAdmin,
    isModerator,
    getSavedConfessions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
