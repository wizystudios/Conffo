
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react';
import { EnhancedRegistrationForm } from '@/components/EnhancedRegistrationForm';

export default function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // If user is already authenticated, redirect to home page
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log("User authenticated, redirecting to home page:", user);
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  // Clean up auth state to prevent issues
  const cleanupAuthState = () => {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    try {
      setLoading(true);
      
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log("Sign out before sign in failed, continuing anyway");
      }
      
      console.log("Attempting to sign in with:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      console.log("Sign in successful, user data:", data);
      
      // Trigger success animation with logo
      const successEvent = new CustomEvent('conffo-success', {
        detail: { message: 'Welcome back!' }
      });
      window.dispatchEvent(successEvent);
      
      // Force a full page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error?.message || "Failed to sign in");
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    try {
      setLoading(true);
      
      // Clean up existing state
      cleanupAuthState();
      
      console.log("Attempting to sign up with:", email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
      
      console.log("Sign up successful, user data:", data);
      
      // Trigger success animation with logo
      const successEvent = new CustomEvent('conffo-success', {
        detail: { message: 'Account created successfully!' }
      });
      window.dispatchEvent(successEvent);
      
      // If auto-confirm is enabled (recommended for development)
      if (data?.user) {
        // Wait a moment to ensure the registration is processed
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setAuthError(error?.message || "Failed to sign up");
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = () => {
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-2">
      <div className="w-full max-w-xs space-y-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/')}
          className="mb-2 h-6 text-xs"
        >
          <ArrowLeft className="h-3 w-3 mr-1" />
          Back
        </Button>

        {authError && (
          <div className="mb-2 p-1.5 bg-destructive/10 border border-destructive/20 rounded">
            <p className="text-xs text-destructive">{authError}</p>
          </div>
        )}
        
        <Tabs defaultValue="login" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 mb-2 h-6">
            <TabsTrigger value="login" className="text-xs">Login</TabsTrigger>
            <TabsTrigger value="register" className="text-xs">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-2">
            <form onSubmit={handleSignIn} className="space-y-2">
              <Input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-7 text-xs"
                required
              />
              <Input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-7 text-xs"
                required
              />
              <Button 
                type="submit" 
                className="w-full h-7 text-xs" 
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-2">
            <EnhancedRegistrationForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
