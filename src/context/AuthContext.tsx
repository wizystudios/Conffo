
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@/types';

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
  const isAuthenticated = !!session && !!user;

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session) {
          const userData = await fetchUserData(session.user.id);
          setUser(userData);
          setIsAdmin(userData?.isAdmin || false);
          setIsModerator(userData?.isModerator || false);
        }
      } catch (error) {
        console.error("Error loading session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session) {
        const userData = await fetchUserData(session.user.id);
        setUser(userData);
        setIsAdmin(userData?.isAdmin || false);
        setIsModerator(userData?.isModerator || false);
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsModerator(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      navigate('/auth');
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
          avatarUrl: profileData.avatarUrl || prev.avatarUrl
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
      const { data, error } = await supabase
        .from('profiles')
        .select('username, is_admin, is_moderator, bio, avatar_url, contact_email, contact_phone')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      return {
        id: userId,
        username: data.username,
        isAdmin: data.is_admin || false,
        isModerator: data.is_moderator || false,
        bio: data.bio || null,
        avatarUrl: data.avatar_url || null,
        contactEmail: data.contact_email || null,
        contactPhone: data.contact_phone || null
      };
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return null;
    }
  };
  
  const createUserProfile = async (userId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert([{ id: userId, username: email.split('@')[0] }]);
      
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
      {!isLoading && children}
    </AuthContext.Provider>
  );
}
