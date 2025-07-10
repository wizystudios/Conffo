import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, Calendar, User } from 'lucide-react';

interface EnhancedRegistrationFormProps {
  onSuccess?: () => void;
}

export function EnhancedRegistrationForm({ onSuccess }: EnhancedRegistrationFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Validation
    if (!email || !password || !username || !birthdate || !gender) {
      setAuthError('All fields are required');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long');
      return;
    }

    const age = validateAge(birthdate);
    if (age < 13) {
      setAuthError('You must be at least 13 years old to register');
      return;
    }

    if (username.length < 3 || username.length > 30) {
      setAuthError('Username must be between 3 and 30 characters');
      return;
    }

    try {
      setLoading(true);

      // Clean up existing state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      console.log("Attempting enhanced sign up for:", email);
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

      // If user is created, update their profile with the additional info
      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username,
            date_of_birth: birthdate,
            gender,
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      console.log("Enhanced sign up successful:", data);

      toast({
        title: "Registration successful",
        description: "Welcome! Please check your email for confirmation instructions.",
      });

      if (onSuccess) {
        onSuccess();
      }

      // If auto-confirm is enabled
      if (data?.user) {
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (error: any) {
      console.error("Enhanced registration error:", error);
      setAuthError(error?.message || "Failed to create account");
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {authError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{authError}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              id="signup-email" 
              type="email" 
              placeholder="your@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 bg-background/50"
              required
            />
          </div>
        </div>

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
              minLength={3}
              maxLength={30}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              id="signup-password" 
              type="password" 
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 bg-background/50"
              minLength={6}
              required
            />
          </div>
        </div>

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
              max={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              required
            />
          </div>
        </div>

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
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold" 
        disabled={loading}
      >
        {loading ? "Creating account..." : "Create Account"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        You must be at least 13 years old to create an account
      </p>
    </form>
  );
}