import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Lock, User, Calendar, Check, Loader2, Phone, ChevronRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';
import { CountrySelector } from '@/components/CountrySelector';

type AuthMode = 'signin' | 'signup';
type SigninMethod = 'email' | 'phone';
type SigninStep = 'identifier' | 'password';
type SignupStep = 'email' | 'password' | 'username' | 'country' | 'birthdate' | 'gender';

const SIGNUP_STEPS: SignupStep[] = ['email', 'password', 'username', 'country', 'birthdate', 'gender'];

export default function MultiStepAuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [signinMethod, setSigninMethod] = useState<SigninMethod>('email');
  const [signinStep, setSigninStep] = useState<SigninStep>('identifier');
  const [signupStepIndex, setSignupStepIndex] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+${digits}`;
  };
  
  const isPhone = (value: string) => /^\+?[\d\s-]{10,}$/.test(value.replace(/\s/g, ''));
  const emailValid = email && /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email);
  const phoneValid = isPhone(phoneNumber);
  const passwordValid = password.length >= 6;
  const usernameValid = username.length >= 3 && username.length <= 30;
  const countryValid = !!country;
  const birthdateValid = birthdate && validateAge(birthdate) >= 13;
  const genderValid = !!gender;

  const currentSignupStep = SIGNUP_STEPS[signupStepIndex];

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

  const canProceedSignup = (): boolean => {
    switch (currentSignupStep) {
      case 'email': return !!emailValid;
      case 'password': return passwordValid;
      case 'username': return usernameValid;
      case 'country': return countryValid;
      case 'birthdate': return !!birthdateValid;
      case 'gender': return genderValid;
      default: return false;
    }
  };

  const handleSignupNext = () => {
    setAuthError(null);
    if (signupStepIndex < SIGNUP_STEPS.length - 1) {
      setSignupStepIndex(prev => prev + 1);
    } else {
      handleSignUp();
    }
  };

  const handleSignupBack = () => {
    setAuthError(null);
    if (signupStepIndex > 0) {
      setSignupStepIndex(prev => prev - 1);
    }
  };

  const handleSigninNext = () => {
    setAuthError(null);
    if (signinStep === 'identifier') {
      const valid = signinMethod === 'email' ? emailValid : phoneValid;
      if (valid) setSigninStep('password');
    } else {
      handleSignIn();
    }
  };

  const handleSignIn = async () => {
    if (signinMethod === 'phone') {
      if (!phoneValid || !passwordValid) return;
      setAuthError(null);
      try {
        setLoading(true);
        const normalized = normalizePhone(phoneNumber);
        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('id')
          .or(`contact_phone.eq.${normalized},contact_phone.eq.${phoneNumber}`)
          .maybeSingle();
        if (lookupError || !profile?.id) throw new Error('No account found with this phone number');
        const { data: userWithEmail } = await supabase
          .from('profiles')
          .select('contact_email')
          .eq('id', profile.id)
          .maybeSingle();
        if (!userWithEmail?.contact_email) throw new Error('Please add your email in profile settings to enable phone login');
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) localStorage.removeItem(key);
        });
        const { error } = await supabase.auth.signInWithPassword({ email: userWithEmail.contact_email, password });
        if (error) throw error;
        setTimeout(() => { window.location.href = '/'; }, 500);
      } catch (error: any) {
        setAuthError(error?.message || 'Failed to sign in');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!emailValid || !passwordValid) return;
    setAuthError(null);
    try {
      setLoading(true);
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) localStorage.removeItem(key);
      });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setTimeout(() => { window.location.href = '/'; }, 500);
    } catch (error: any) {
      setAuthError(error?.message || 'Failed to sign in');
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
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) localStorage.removeItem(key);
      });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { username, birthdate, gender }
        }
      });
      if (error) throw error;
      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username,
          date_of_birth: birthdate,
          gender,
          location: country,
          updated_at: new Date().toISOString()
        });
        setTimeout(() => { window.location.href = '/'; }, 1000);
      }
    } catch (error: any) {
      setAuthError(error?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail(''); setPassword(''); setPhoneNumber(''); setUsername('');
    setBirthdate(''); setGender(''); setCountry('');
    setAuthError(null); setSigninStep('identifier'); setSignupStepIndex(0);
  };

  const handleModeSwitch = (mode: AuthMode) => {
    setAuthMode(mode);
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (authMode === 'signin') handleSigninNext();
      else if (canProceedSignup()) handleSignupNext();
    }
  };

  const renderSigninStep = () => {
    if (signinStep === 'identifier') {
      return (
        <div className="space-y-6" onKeyDown={handleKeyDown}>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Enter your {signinMethod === 'email' ? 'email' : 'phone number'}</p>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={() => setSigninMethod('email')}
              className={`text-sm flex items-center gap-1.5 px-3 py-1.5 transition-colors ${signinMethod === 'email' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
            <button onClick={() => setSigninMethod('phone')}
              className={`text-sm flex items-center gap-1.5 px-3 py-1.5 transition-colors ${signinMethod === 'phone' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
              <Phone className="h-3.5 w-3.5" /> Phone
            </button>
          </div>

          {signinMethod === 'email' ? (
            <div className="relative">
              <Mail className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder="your@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                autoFocus />
            </div>
          ) : (
            <div className="relative">
              <Phone className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="tel" placeholder="+1234567890" value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                autoFocus />
            </div>
          )}

          <Button onClick={handleSigninNext}
            disabled={signinMethod === 'email' ? !emailValid : !phoneValid}
            className="w-full h-11 conffo-confess-btn text-white">
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6" onKeyDown={handleKeyDown}>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Enter password</h2>
          <p className="text-sm text-muted-foreground">
            {signinMethod === 'email' ? email : phoneNumber}
          </p>
        </div>

        <div className="relative">
          <Lock className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
          <Input type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
            autoFocus />
        </div>

        <button onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline">
          Forgot password?
        </button>

        <Button onClick={handleSignIn} disabled={!passwordValid || loading}
          className="w-full h-11 conffo-confess-btn text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
        </Button>
      </div>
    );
  };

  const renderSignupStep = () => {
    const stepNumber = signupStepIndex + 1;
    const totalSteps = SIGNUP_STEPS.length;

    const stepContent = () => {
      switch (currentSignupStep) {
        case 'email':
          return (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Your email</h2>
                <p className="text-sm text-muted-foreground">We'll use this to sign you in</p>
              </div>
              <div className="relative">
                <Mail className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="your@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus />
              </div>
            </>
          );
        case 'password':
          return (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Create password</h2>
                <p className="text-sm text-muted-foreground">At least 6 characters</p>
              </div>
              <div className="relative">
                <Lock className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="Password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus />
              </div>
            </>
          );
        case 'username':
          return (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Pick a username</h2>
                <p className="text-sm text-muted-foreground">3-30 characters</p>
              </div>
              <div className="relative">
                <User className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="text" placeholder="username" value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus />
              </div>
            </>
          );
        case 'country':
          return (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Where are you from?</h2>
                <p className="text-sm text-muted-foreground">Select your country</p>
              </div>
              <CountrySelector value={country} onChange={setCountry} />
            </>
          );
        case 'birthdate':
          return (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Date of birth</h2>
                <p className="text-sm text-muted-foreground">You must be at least 13 years old</p>
              </div>
              <div className="relative">
                <Calendar className="absolute left-0 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="pl-7 h-11 bg-transparent border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  max={new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  autoFocus />
              </div>
            </>
          );
        case 'gender':
          return (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Gender</h2>
                <p className="text-sm text-muted-foreground">Select your gender</p>
              </div>
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
            </>
          );
      }
    };

    return (
      <div className="space-y-6" onKeyDown={handleKeyDown}>
        {/* Progress bar */}
        <div className="flex gap-1">
          {SIGNUP_STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 transition-all ${i <= signupStepIndex ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">Step {stepNumber} of {totalSteps}</p>

        {stepContent()}

        <Button onClick={handleSignupNext} disabled={!canProceedSignup() || loading}
          className="w-full h-11 conffo-confess-btn text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
            signupStepIndex === SIGNUP_STEPS.length - 1 ? 'Create Account' : 'Next'}
          {!loading && signupStepIndex < SIGNUP_STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="icon"
          onClick={() => {
            if (authMode === 'signin' && signinStep === 'password') {
              setSigninStep('identifier');
              setAuthError(null);
              return;
            }
            if (authMode === 'signup' && signupStepIndex > 0) {
              handleSignupBack();
              return;
            }
            navigate('/');
          }}
          className="absolute top-4 left-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div className="text-center pt-8">
          <h1 className="text-3xl font-bold conffo-text-gradient mb-2">Conffo</h1>
          <p className="text-sm text-muted-foreground">Share Your Confessions Anonymously</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 justify-center">
          <button onClick={() => handleModeSwitch('signin')}
            className={`px-6 py-2 text-sm font-medium transition-all border-b-2 ${authMode === 'signin' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            Sign In
          </button>
          <button onClick={() => handleModeSwitch('signup')}
            className={`px-6 py-2 text-sm font-medium transition-all border-b-2 ${authMode === 'signup' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            Sign Up
          </button>
        </div>

        {authError && (
          <div className="py-2 text-center">
            <p className="text-sm text-destructive">{authError}</p>
          </div>
        )}

        {authMode === 'signin' ? renderSigninStep() : renderSignupStep()}

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{' '}
          <button onClick={() => navigate('/terms')} className="text-primary hover:underline">Terms</button>{' '}and{' '}
          <button onClick={() => navigate('/privacy')} className="text-primary hover:underline">Privacy Policy</button>
        </p>
      </div>

      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
    </div>
  );
}
