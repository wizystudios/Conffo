import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Lock, User, Calendar, Check, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';

type AuthMode = 'signin' | 'signup';
type SigninMethod = 'email' | 'phone';

export default function MultiStepAuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [signinMethod, setSigninMethod] = useState<SigninMethod>('email');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Phone number normalization - strip all non-digits except leading +
  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+${digits}`;
  };
  
  // Validation - stricter email validation requiring proper TLD
  const isPhone = (value: string) => /^\+?[\d\s-]{10,}$/.test(value.replace(/\s/g, ''));
  const emailValid = email && /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email);
  const phoneValid = isPhone(phoneNumber);
  const identifierValid = signinMethod === 'email' ? emailValid : phoneValid;
  const passwordValid = password.length >= 6;
  const usernameValid = username.length >= 3 && username.length <= 30;
  const birthdateValid = birthdate && validateAge(birthdate) >= 13;
  const genderValid = !!gender;

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  function validateAge(birthdate: string) {
    const today = new Date();
    const birth = new Date(birthdate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  }

  const handleSignIn = async () => {
    // For phone login, we need to look up the email first
    if (signinMethod === 'phone') {
      if (!phoneValid || !passwordValid) return;
      setAuthError(null);

      try {
        setLoading(true);

        // Look up the email by phone number from profiles (normalized)
        const normalized = normalizePhone(phoneNumber);
        
        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('id')
          .or(`contact_phone.eq.${normalized},contact_phone.eq.${phoneNumber}`)
          .maybeSingle();

        if (lookupError || !profile?.id) {
          throw new Error('No account found with this phone number');
        }

        // Use the email from the auth.users linked to profile
        const { data: userWithEmail } = await supabase
          .from('profiles')
          .select('contact_email')
          .eq('id', profile.id)
          .maybeSingle();
        
        if (!userWithEmail?.contact_email) {
          throw new Error('Please add your email in profile settings to enable phone login');
        }

        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });

        const { data, error } = await supabase.auth.signInWithPassword({
          email: userWithEmail.contact_email,
          password,
        });

        if (error) throw error;

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
      return;
    }

    // Email login
    if (!emailValid || !passwordValid) return;
    setAuthError(null);

    try {
      setLoading(true);

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

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

  const handleSignUp = async () => {
    if (!emailValid || !passwordValid || !usernameValid || !birthdateValid || !genderValid) return;
    setAuthError(null);

    try {
      setLoading(true);

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
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

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setPhoneNumber('');
    setUsername('');
    setBirthdate('');
    setGender('');
    setAuthError(null);
  };

  const handleModeSwitch = (mode: AuthMode) => {
    setAuthMode(mode);
    resetForm();
  };

  // Determine current step for signup
  const getCurrentSignupStep = () => {
    if (!emailValid) return 'email';
    if (!passwordValid) return 'password';
    if (!usernameValid) return 'username';
    if (!birthdateValid) return 'birthdate';
    return 'gender';
  };

  const signupStep = getCurrentSignupStep();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Back button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/')}
          className="absolute top-4 left-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Logo/Brand - Free, no container */}
        <div className="text-center pt-8">
          <h1 className="text-3xl font-bold conffo-text-gradient mb-2">Conffo</h1>
          <p className="text-sm text-muted-foreground">Share Your Confessions Anonymously</p>
        </div>

        {/* Mode Toggle - Free style, no box */}
        <div className="flex gap-1 justify-center">
          <button
            onClick={() => handleModeSwitch('signin')}
            className={`px-6 py-2 text-sm font-medium transition-all border-b-2 ${
              authMode === 'signin' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => handleModeSwitch('signup')}
            className={`px-6 py-2 text-sm font-medium transition-all border-b-2 ${
              authMode === 'signup' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        {authError && (
          <div className="py-2 text-center">
            <p className="text-sm text-destructive">{authError}</p>
          </div>
        )}

        {/* Sign In Flow - Free design, no card container */}
        {authMode === 'signin' && (
          <div className="space-y-4">
            {/* Toggle between email/phone */}
            <div className="flex gap-4 justify-center mb-4">
              <button 
                onClick={() => setSigninMethod('email')}
                className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                  signinMethod === 'email' 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
              <button 
                onClick={() => setSigninMethod('phone')}
                className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                  signinMethod === 'phone' 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                <Phone className="h-3.5 w-3.5" /> Phone
              </button>
            </div>

            {/* Email input - Free, borderless style */}
            {signinMethod === 'email' && (
              <div className="relative">
                <Mail className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="Email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus
                />
                {emailValid && <Check className="absolute right-0 top-3 h-4 w-4 text-green-500" />}
              </div>
            )}

            {/* Phone input - Free, borderless style */}
            {signinMethod === 'phone' && (
              <div className="relative">
                <Phone className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="tel" 
                  placeholder="Phone number" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus
                />
                {phoneValid && <Check className="absolute right-0 top-3 h-4 w-4 text-green-500" />}
              </div>
            )}

            {/* Password - Free, borderless style */}
            {identifierValid && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2">
                <Lock className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus
                />
                {loading && <Loader2 className="absolute right-0 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            )}

            {/* Forgot password link */}
            {identifierValid && (
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}

            {/* Sign in button */}
            {identifierValid && passwordValid && (
              <Button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full h-11 rounded-full conffo-confess-btn text-white mt-4"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
              </Button>
            )}
          </div>
        )}

        {/* Sign Up Flow - Free design, no card container */}
        {authMode === 'signup' && (
          <div className="space-y-4">
            {/* Email - Free, borderless style */}
            <div className="relative">
              <Mail className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                autoFocus={signupStep === 'email'}
              />
              {emailValid && <Check className="absolute right-0 top-3 h-4 w-4 text-green-500" />}
            </div>

            {/* Password - Free, borderless style */}
            {emailValid && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2">
                <Lock className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Password (6+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus={signupStep === 'password'}
                />
                {passwordValid && <Check className="absolute right-0 top-3 h-4 w-4 text-green-500" />}
              </div>
            )}

            {/* Username - Free, borderless style */}
            {passwordValid && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2">
                <User className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus={signupStep === 'username'}
                />
                {usernameValid && <Check className="absolute right-0 top-3 h-4 w-4 text-green-500" />}
              </div>
            )}

            {/* Birthdate - Free, borderless style */}
            {usernameValid && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2">
                <Calendar className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="date" 
                  placeholder="Date of birth"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus={signupStep === 'birthdate'}
                />
                {birthdateValid && <Check className="absolute right-0 top-3 h-4 w-4 text-green-500" />}
              </div>
            )}

            {/* Gender - Minimal style */}
            {birthdateValid && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus:ring-0">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sign up button */}
            {genderValid && (
              <Button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full h-11 rounded-full conffo-confess-btn text-white mt-4"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
              </Button>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{' '}
          <button onClick={() => navigate('/terms')} className="text-primary hover:underline">
            Terms
          </button>{' '}
          and{' '}
          <button onClick={() => navigate('/privacy')} className="text-primary hover:underline">
            Privacy Policy
          </button>
        </p>
      </div>

      <ForgotPasswordModal 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </div>
  );
}
