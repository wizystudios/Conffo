import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Mail, Lock, User, Calendar } from 'lucide-react';

type AuthMode = 'signin' | 'signup';
type SignInStep = 'email' | 'password';
type SignUpStep = 'email' | 'password' | 'username' | 'birthdate' | 'gender';

export default function MultiStepAuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  
  // Sign in state
  const [signInStep, setSignInStep] = useState<SignInStep>('email');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign up state
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const validateAge = (birthdate: string) => {
    const today = new Date();
    const birth = new Date(birthdate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const handleSignInNext = () => {
    setAuthError(null);
    
    if (signInStep === 'email') {
      if (!signInEmail || !/\S+@\S+\.\S+/.test(signInEmail)) {
        setAuthError('Please enter a valid email address');
        return;
      }
      setSignInStep('password');
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!signInPassword) {
      setAuthError('Please enter your password');
      return;
    }

    try {
      setLoading(true);

      // Clean up existing auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (error) throw error;

      // Trigger success animation
      const successEvent = new CustomEvent('conffo-success', {
        detail: { message: 'Welcome back!' }
      });
      window.dispatchEvent(successEvent);

      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error: any) {
      setAuthError(error?.message || 'Failed to sign in');
      toast({
        title: 'Sign in failed',
        description: error?.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpNext = () => {
    setAuthError(null);
    
    if (signUpStep === 'email') {
      if (!signUpEmail || !/\S+@\S+\.\S+/.test(signUpEmail)) {
        setAuthError('Please enter a valid email address');
        return;
      }
      setSignUpStep('password');
    } else if (signUpStep === 'password') {
      if (!signUpPassword || signUpPassword.length < 6) {
        setAuthError('Password must be at least 6 characters');
        return;
      }
      setSignUpStep('username');
    } else if (signUpStep === 'username') {
      if (!username || username.length < 3 || username.length > 30) {
        setAuthError('Username must be between 3 and 30 characters');
        return;
      }
      setSignUpStep('birthdate');
    } else if (signUpStep === 'birthdate') {
      if (!birthdate) {
        setAuthError('Please enter your date of birth');
        return;
      }
      const age = validateAge(birthdate);
      if (age < 13) {
        setAuthError('You must be at least 13 years old to register');
        return;
      }
      setSignUpStep('gender');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!gender) {
      setAuthError('Please select your gender');
      return;
    }

    try {
      setLoading(true);

      // Clean up existing auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username,
            birthdate,
            gender
          }
        }
      });

      if (error) throw error;

      // Update profile
      if (data?.user) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username,
            date_of_birth: birthdate,
            gender,
            updated_at: new Date().toISOString()
          });
      }

      // Trigger success animation
      const successEvent = new CustomEvent('conffo-success', {
        detail: { message: 'Account created successfully!' }
      });
      window.dispatchEvent(successEvent);

      if (data?.user) {
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (error: any) {
      setAuthError(error?.message || 'Failed to create account');
      toast({
        title: 'Sign up failed',
        description: error?.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setAuthError(null);
    
    if (authMode === 'signin') {
      if (signInStep === 'password') setSignInStep('email');
    } else {
      if (signUpStep === 'password') setSignUpStep('email');
      else if (signUpStep === 'username') setSignUpStep('password');
      else if (signUpStep === 'birthdate') setSignUpStep('username');
      else if (signUpStep === 'gender') setSignUpStep('birthdate');
    }
  };

  const canGoBack = (authMode === 'signin' && signInStep !== 'email') || 
                     (authMode === 'signup' && signUpStep !== 'email');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-6 relative">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/')}
              className="absolute left-0 p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Share your thoughts anonymously with the world
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-border/50">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-8 p-1 bg-muted rounded-lg">
            <Button
              variant={authMode === 'signin' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => {
                setAuthMode('signin');
                setSignInStep('email');
                setAuthError(null);
              }}
            >
              Sign In
            </Button>
            <Button
              variant={authMode === 'signup' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => {
                setAuthMode('signup');
                setSignUpStep('email');
                setAuthError(null);
              }}
            >
              Sign Up
            </Button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{authError}</p>
            </div>
          )}

          {/* Sign In Flow */}
          {authMode === 'signin' && (
            <form onSubmit={signInStep === 'password' ? handleSignInSubmit : (e) => { e.preventDefault(); handleSignInNext(); }} className="space-y-6">
              {signInStep === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signin-email" 
                      type="email" 
                      placeholder="your@email.com" 
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="pl-10 h-12 bg-background/50"
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              {signInStep === 'password' && (
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signin-password" 
                      type="password" 
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="pl-10 h-12 bg-background/50"
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {canGoBack && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading}
                >
                  {signInStep === 'password' ? (loading ? 'Signing in...' : 'Sign In') : 'Next'}
                  {signInStep !== 'password' && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </form>
          )}

          {/* Sign Up Flow */}
          {authMode === 'signup' && (
            <form onSubmit={signUpStep === 'gender' ? handleSignUpSubmit : (e) => { e.preventDefault(); handleSignUpNext(); }} className="space-y-6">
              {signUpStep === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="your@email.com" 
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="pl-10 h-12 bg-background/50"
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              {signUpStep === 'password' && (
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Create Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signup-password" 
                      type="password" 
                      placeholder="At least 6 characters"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      className="pl-10 h-12 bg-background/50"
                      autoFocus
                      minLength={6}
                      required
                    />
                  </div>
                </div>
              )}

              {signUpStep === 'username' && (
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-sm font-medium">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signup-username" 
                      type="text" 
                      placeholder="Choose a username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-12 bg-background/50"
                      autoFocus
                      minLength={3}
                      maxLength={30}
                      required
                    />
                  </div>
                </div>
              )}

              {signUpStep === 'birthdate' && (
                <div className="space-y-2">
                  <Label htmlFor="signup-birthdate" className="text-sm font-medium">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signup-birthdate" 
                      type="date" 
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className="pl-10 h-12 bg-background/50"
                      autoFocus
                      max={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">You must be at least 13 years old</p>
                </div>
              )}

              {signUpStep === 'gender' && (
                <div className="space-y-2">
                  <Label htmlFor="signup-gender" className="text-sm font-medium">Gender</Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger className="h-12 bg-background/50">
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2">
                {canGoBack && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading}
                >
                  {signUpStep === 'gender' ? (loading ? 'Creating account...' : 'Create Account') : 'Next'}
                  {signUpStep !== 'gender' && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
