import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Loader2, ChevronRight } from 'lucide-react';
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .or(`contact_phone.eq.${normalized},contact_phone.eq.${phoneNumber}`)
          .maybeSingle();
        if (!profile?.id) throw new Error('No account found with this phone number');
        const { data: userWithEmail } = await supabase
          .from('profiles')
          .select('contact_email')
          .eq('id', profile.id)
          .maybeSingle();
        if (!userWithEmail?.contact_email) throw new Error('Add email in settings to enable phone login');
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

  const placeholders: Record<string, string> = {
    email: 'Enter your email',
    password: 'Enter password',
    username: 'Choose a username',
    birthdate: '',
    country: '',
    gender: '',
  };

  // Sign-in: just input + next + bottom links
  const renderSigninStep = () => {
    if (signinStep === 'identifier') {
      return (
        <div className="space-y-6" onKeyDown={handleKeyDown}>
          {signinMethod === 'email' ? (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-transparent border-0 border-b border-border/40 outline-none focus:border-primary text-base transition-colors placeholder:text-muted-foreground/60"
              autoFocus
            />
          ) : (
            <input
              type="tel"
              placeholder="Phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full h-12 bg-transparent border-0 border-b border-border/40 outline-none focus:border-primary text-base transition-colors placeholder:text-muted-foreground/60"
              autoFocus
            />
          )}

          <Button
            onClick={handleSigninNext}
            disabled={signinMethod === 'email' ? !emailValid : !phoneValid}
            className="w-full h-12 text-base font-semibold"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

          {/* Bottom links */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              onClick={() => setSigninMethod(signinMethod === 'email' ? 'phone' : 'email')}
              className="text-sm text-primary"
            >
              {signinMethod === 'email' ? 'Use phone number' : 'Use email'}
            </button>
            <button
              onClick={() => handleModeSwitch('signup')}
              className="text-sm text-muted-foreground"
            >
              Register
            </button>
          </div>
        </div>
      );
    }

    // Password step
    return (
      <div className="space-y-6" onKeyDown={handleKeyDown}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-12 bg-transparent border-0 border-b border-border/40 outline-none focus:border-primary text-base transition-colors placeholder:text-muted-foreground/60"
          autoFocus
        />

        <Button
          onClick={handleSignIn}
          disabled={!passwordValid || loading}
          className="w-full h-12 text-base font-semibold"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Next'}
        </Button>

        <div className="flex flex-col items-center gap-3 pt-2">
          <button onClick={() => setShowForgotPassword(true)} className="text-sm text-primary">
            Forgot password?
          </button>
        </div>
      </div>
    );
  };

  // Sign-up: just input + next + bottom link
  const renderSignupStep = () => {
    const renderField = () => {
      switch (currentSignupStep) {
        case 'email':
          return (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-transparent border-0 border-b border-border/40 outline-none focus:border-primary text-base transition-colors placeholder:text-muted-foreground/60"
              autoFocus
            />
          );
        case 'password':
          return (
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-transparent border-0 border-b border-border/40 outline-none focus:border-primary text-base transition-colors placeholder:text-muted-foreground/60"
              autoFocus
            />
          );
        case 'username':
          return (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 bg-transparent border-0 border-b border-border/40 outline-none focus:border-primary text-base transition-colors placeholder:text-muted-foreground/60"
              autoFocus
            />
          );
        case 'country':
          return <CountrySelector value={country} onChange={setCountry} />;
        case 'birthdate':
          return (
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="w-full h-12 bg-transparent border-0 border-b border-border/40 outline-none focus:border-primary text-base transition-colors"
              max={new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              autoFocus
            />
          );
        case 'gender':
          return (
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="h-12 bg-transparent border-0 border-b border-border/40 rounded-none focus:ring-0 text-base">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          );
      }
    };

    return (
      <div className="space-y-6" onKeyDown={handleKeyDown}>
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center">
          {SIGNUP_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i <= signupStepIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>

        {renderField()}

        <Button
          onClick={handleSignupNext}
          disabled={!canProceedSignup() || loading}
          className="w-full h-12 text-base font-semibold"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : signupStepIndex === SIGNUP_STEPS.length - 1 ? (
            'Create Account'
          ) : (
            <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>

        {/* Bottom link */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            onClick={() => handleModeSwitch('signin')}
            className="text-sm text-muted-foreground"
          >
            Already have an account? <span className="text-primary">Sign in</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm space-y-10">
        {/* Back button - only show when navigable */}
        {((authMode === 'signin' && signinStep === 'password') || (authMode === 'signup' && signupStepIndex > 0)) && (
          <button
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
            }}
            className="p-2 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {authError && (
          <p className="text-sm text-destructive text-center">{authError}</p>
        )}

        {authMode === 'signin' ? renderSigninStep() : renderSignupStep()}
      </div>

      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
    </div>
  );
}
