
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthUser extends SupabaseUser {
  username?: string;
  avatarUrl?: string;
  onboardingCompleted?: boolean;
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

      console.log('Fetching user profile for:', userId);

      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      // is_admin is read via a security-definer RPC because the column is
      // revoked from authenticated clients.
      let isAdminFlag = false;
      try {
        const { data: adminFlag } = await supabase.rpc('is_current_user_admin' as never);
        isAdminFlag = Boolean(adminFlag);
      } catch (e) {
        console.warn('is_current_user_admin RPC failed', e);
      }

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      if (!profile) {
        console.log('No profile found, creating default profile');
        const emailUsername = authUser.email?.split('@')[0] || 'user';
        
        try {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              username: emailUsername,
              onboarding_completed: false,
              updated_at: new Date().toISOString()
            });

          if (!insertError) {
            profile = {
              username: emailUsername,
              avatar_url: null,
              onboarding_completed: false,
            };
            console.log('Created default profile');
          } else {
            console.error('Error creating profile:', insertError);
          }
        } catch (error) {
          console.error('Error in profile creation:', error);
        }
      }
      
      setIsAdmin(isAdminFlag);
      
      return {
        ...authUser,
        username: profile?.username || authUser.email?.split('@')[0] || 'User',
        avatarUrl: profile?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${userId}`,
        onboardingCompleted: profile?.onboarding_completed ?? false,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const refreshUser = async () => {
    if (session?.user?.id) {
      console.log('Refreshing user profile');
      const updatedUser = await fetchUserProfile(session.user.id);
      setUser(updatedUser);
    }
  };

  const updateUsername = async (username: string) => {
    if (!user) return;
    
    try {
      console.log('Updating username to:', username);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      await refreshUser();
      console.log('Username updated successfully');
    } catch (error) {
      console.error('Error updating username:', error);
      throw error;
    }
  };

  const updateUserProfile = async (profileData: any) => {
    if (!user) return;
    
    try {
      console.log('Updating user profile:', profileData);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...profileData,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      await refreshUser();
      console.log('Profile updated successfully');
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
    let currentAdmin = false;

    const logAdminEvent = async (event: 'sign_in' | 'sign_out' | 'token_refresh' | 'session_restored') => {
      try {
        await supabase.rpc('log_admin_session_event' as never, {
          p_event: event,
          p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        } as never);
      } catch (e) {
        console.warn('log_admin_session_event failed', e);
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const u = await fetchUserProfile(session.user.id);
        setUser(u);
        currentAdmin = !!u && isAdmin;
        // Fire-and-forget: audit log runs server-side and only records for admins.
        logAdminEvent('session_restored');
      }
      setIsLoading(false);
    });

    // Recover from token refresh failure (expired refresh token, revoked session, etc.)
    // by clearing local state and pushing user to /auth instead of leaving them stuck.
    const handleRefreshFailure = () => {
      console.warn('Token refresh failed — signing out.');
      setSession(null);
      setUser(null);
      setIsAdmin(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      setSession(session);

      if (event === 'TOKEN_REFRESHED' && !session) {
        handleRefreshFailure();
        return;
      }

      if (session?.user) {
        setTimeout(async () => {
          const userWithProfile = await fetchUserProfile(session.user.id);
          setUser(userWithProfile);
          setIsLoading(false);

          if (event === 'SIGNED_IN') logAdminEvent('sign_in');
          if (event === 'TOKEN_REFRESHED') logAdminEvent('token_refresh');

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            window.dispatchEvent(new CustomEvent('auth-restored', {
              detail: { userId: session.user.id },
            }));
          }
        }, 0);
      } else {
        if (event === 'SIGNED_OUT' && currentAdmin) {
          // Best-effort — request may 401 after sign-out, that's fine.
          logAdminEvent('sign_out');
        }
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    // Preserve session across restart: proactively refresh when tab becomes visible
    // again, so a long-idle tab doesn't sit on a stale access token.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) return;
          const expiresAt = (data.session.expires_at ?? 0) * 1000;
          if (expiresAt - Date.now() < 60_000) {
            supabase.auth.refreshSession().catch(handleRefreshFailure);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out user');
      // Clean up local storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      await supabase.auth.signOut({ scope: 'global' });
      try {
        window.dispatchEvent(new CustomEvent('conffo-success', { detail: { message: 'Logged out' } }));
      } catch {}
      setTimeout(() => { window.location.href = '/auth'; }, 1700);
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
