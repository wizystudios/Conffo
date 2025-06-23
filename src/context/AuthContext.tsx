
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthUser extends SupabaseUser {
  username?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  logout: () => Promise<void>; // Alias for signOut
  refreshUser: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  updateUserProfile: (profile: any) => Promise<void>;
  getSavedConfessions: () => Promise<any[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserProfile = async (userId: string): Promise<AuthUser | null> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_admin')
        .eq('id', userId)
        .single();

      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        setIsAdmin(profile?.is_admin || false);
        return {
          ...authUser,
          username: profile?.username || null,
          avatarUrl: profile?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${userId}`,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const refreshUser = async () => {
    if (session?.user?.id) {
      const updatedUser = await fetchUserProfile(session.user.id);
      setUser(updatedUser);
    }
  };

  const updateUsername = async (username: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      await refreshUser();
    } catch (error) {
      console.error('Error updating username:', error);
      throw error;
    }
  };

  const updateUserProfile = async (profileData: any) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...profileData,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      await refreshUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const getSavedConfessions = async () => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('saved_confessions')
        .select(`
          confession_id,
          confessions (*)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching saved confessions:', error);
      return [];
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).then(setUser);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      setSession(session);
      
      if (session?.user) {
        // Defer profile fetching to prevent potential deadlocks
        setTimeout(async () => {
          const userWithProfile = await fetchUserProfile(session.user.id);
          setUser(userWithProfile);
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Clean up auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      await supabase.auth.signOut({ scope: 'global' });
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if sign out fails
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    isAuthenticated: !!session && !!user,
    isLoading,
    isAdmin,
    signOut,
    logout: signOut, // Alias for signOut
    refreshUser,
    updateUsername,
    updateUserProfile,
    getSavedConfessions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
