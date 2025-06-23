
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
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<AuthUser | null> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
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
    signOut,
    refreshUser,
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
