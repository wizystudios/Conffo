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

  // Auto-submit sign in when password is entered
  useEffect(() => {
    if (authMode === 'signin' && emailValid && passwordValid && !loading) {
      handleSignIn();
    }
  }, [password]);

  // Auto-advance signup flow
  useEffect(() => {
    if (authMode === 'signup' && genderValid && emailValid && passwordValid && usernameValid && birthdateValid && !loading) {
      handleSignUp();
    }
  }, [gender]);

  const handleSignIn = async () => {
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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

        {/* Mode Toggle */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleModeSwitch('signin')}
            className={`text-lg font-medium pb-1 border-b-2 transition-colors ${
              authMode === 'signin' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => handleModeSwitch('signup')}
            className={`text-lg font-medium pb-1 border-b-2 transition-colors ${
              authMode === 'signup' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        {authError && (
          <div className="p-3 bg-destructive/10 rounded-lg text-center">
            <p className="text-sm text-destructive">{authError}</p>
          </div>
        )}

        {/* Sign In Flow */}
        {authMode === 'signin' && (
          <div className="space-y-4">
            {/* Toggle between email/phone */}
            <div className="flex gap-2 justify-center mb-2">
              <Button 
                variant={signinMethod === 'email' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSigninMethod('email')}
              >
                <Mail className="h-4 w-4 mr-1" /> Email
              </Button>
              <Button 
                variant={signinMethod === 'phone' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSigninMethod('phone')}
              >
                <Phone className="h-4 w-4 mr-1" /> Phone
              </Button>
            </div>

            {/* Email input - smaller, no box */}
            {signinMethod === 'email' && (
              <div className="relative">
                <Mail className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="Email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-7 h-9 text-sm bg-transparent border-0 border-b border-muted-foreground/30 rounded-none focus:ring-0 focus-visible:ring-0"
                  autoFocus
                />
                {emailValid && <Check className="absolute right-2 top-2.5 h-3 w-3 text-green-500" />}
              </div>
            )}

            {/* Phone input - smaller, no box */}
            {signinMethod === 'phone' && (
              <div className="relative">
                <Phone className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input 
                  type="tel" 
                  placeholder="Phone number" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-7 h-9 text-sm bg-transparent border-0 border-b border-muted-foreground/30 rounded-none focus:ring-0 focus-visible:ring-0"
                  autoFocus
                />
                {phoneValid && <Check className="absolute right-2 top-2.5 h-3 w-3 text-green-500" />}
              </div>
            )}

            {/* Password - shows when identifier is valid - smaller, no box */}
            {identifierValid && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2">
                <Lock className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-7 h-9 text-sm bg-transparent border-0 border-b border-muted-foreground/30 rounded-none focus:ring-0 focus-visible:ring-0"
                  autoFocus
                />
                {loading && <Loader2 className="absolute right-2 top-2.5 h-3 w-3 animate-spin text-muted-foreground" />}
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
          </div>
        )}

        {/* Sign Up Flow */}
        {authMode === 'signup' && (
          <div className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 bg-transparent border-muted-foreground/30"
                autoFocus={signupStep === 'email'}
                disabled={signupStep !== 'email'}
              />
              {emailValid && <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />}
            </div>

            {/* Password */}
            {emailValid && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Password (6+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-transparent border-muted-foreground/30"
                  autoFocus={signupStep === 'password'}
                  disabled={signupStep !== 'password'}
                />
                {passwordValid && <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />}
              </div>
            )}

            {/* Username */}
            {passwordValid && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 bg-transparent border-muted-foreground/30"
                  autoFocus={signupStep === 'username'}
                  disabled={signupStep !== 'username'}
                  minLength={3}
                  maxLength={30}
                />
                {usernameValid && <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />}
              </div>
            )}

            {/* Birthdate */}
            {usernameValid && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="date" 
                  placeholder="Date of birth"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="pl-10 h-11 bg-transparent border-muted-foreground/30"
                  autoFocus={signupStep === 'birthdate'}
                  disabled={signupStep !== 'birthdate'}
                  max={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                {birthdateValid && <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />}
              </div>
            )}

            {/* Gender */}
            {birthdateValid && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <Select value={gender} onValueChange={setGender} disabled={signupStep !== 'gender'}>
                  <SelectTrigger className="h-11 bg-transparent border-muted-foreground/30">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                {loading && (
                  <div className="flex items-center justify-center mt-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Back link for going back to previous field */}
        {authMode === 'signin' && emailValid && (
          <button 
            onClick={() => { setPassword(''); setEmail(''); }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        )}

        {authMode === 'signup' && signupStep !== 'email' && (
          <button 
            onClick={() => {
              if (signupStep === 'password') { setPassword(''); setEmail(''); }
              else if (signupStep === 'username') { setUsername(''); setPassword(''); }
              else if (signupStep === 'birthdate') { setBirthdate(''); setUsername(''); }
              else if (signupStep === 'gender') { setGender(''); setBirthdate(''); }
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        )}

        <p className="text-xs text-muted-foreground text-center pt-4">
          By continuing, you agree to our Terms and Privacy Policy
        </p>
      </div>
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </div>
  );
}
