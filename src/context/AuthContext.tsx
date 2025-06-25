
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
  logout: () => Promise<void>;
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return null;

      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_admin')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      if (!profile) {
        const emailUsername = authUser.email?.split('@')[0] || 'user';
        
        try {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              username: emailUsername,
              updated_at: new Date().toISOString()
            });

          if (!insertError) {
            profile = {
              username: emailUsername,
              avatar_url: null,
              is_admin: false
            };
          } else {
            console.error('Error creating profile:', insertError);
          }
        } catch (error) {
          console.error('Error in profile creation:', error);
        }
      }
      
      setIsAdmin(profile?.is_admin || false);
      
      return {
        ...authUser,
        username: profile?.username || authUser.email?.split('@')[0] || 'User',
        avatarUrl: profile?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${userId}`,
      };
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
        .select('confession_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data?.map(item => item.confession_id) || [];
    } catch (error) {
      console.error('Error fetching saved confessions:', error);
      return [];
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).then(setUser);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        // Use setTimeout to prevent potential deadlocks
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
      // Clean up local storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
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
    logout: signOut,
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
