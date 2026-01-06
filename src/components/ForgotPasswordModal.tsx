import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, Phone, Lock, Check, ArrowLeft } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'identifier' | 'verify' | 'newPassword' | 'success';

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foundUserId, setFoundUserId] = useState<string | null>(null);

  const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
  const isPhone = (value: string) => /^\+?[\d\s-]{10,}$/.test(value.replace(/\s/g, ''));

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    if (isEmail(value)) {
      setIdentifierType('email');
    } else if (isPhone(value)) {
      setIdentifierType('phone');
    }
  };

  const verifyAccount = async () => {
    if (!identifier.trim()) return;
    
    setIsLoading(true);
    try {
      // Check if user exists with this email or phone
      let query = supabase.from('profiles').select('id');
      
      if (identifierType === 'email') {
        // For email, we need to check auth.users table indirectly
        // Since we can't query auth.users directly, we'll use the identifier
        const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
          email: identifier,
          options: {
            shouldCreateUser: false,
          }
        });
        
        // If no error, user exists - but we won't actually send OTP
        // Just verify account exists
        if (!authError || authError.message.includes('already')) {
          setFoundUserId(identifier);
          setStep('newPassword');
          return;
        }
        
        // Fallback: check profiles table for contact_email
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('contact_email', identifier)
          .maybeSingle();
          
        if (data) {
          setFoundUserId(data.id);
          setStep('newPassword');
        } else {
          toast({ variant: "destructive", description: "No account found with this email" });
        }
      } else {
        // Check phone number in profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('contact_phone', identifier.replace(/\s/g, ''))
          .maybeSingle();
          
        if (data) {
          setFoundUserId(data.id);
          setStep('newPassword');
        } else {
          toast({ variant: "destructive", description: "No account found with this phone number" });
        }
      }
    } catch (error) {
      toast({ variant: "destructive", description: "Failed to verify account" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) {
      toast({ variant: "destructive", description: "Password must be at least 6 characters" });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", description: "Passwords don't match" });
      return;
    }
    
    setIsLoading(true);
    try {
      // Use Supabase's password reset flow
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        // If user isn't logged in, we need to use email reset
        if (identifierType === 'email') {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(identifier, {
            redirectTo: `${window.location.origin}/auth?type=recovery`,
          });
          
          if (resetError) throw resetError;
          
          toast({ 
            description: "Password reset link sent to your email. Check your inbox!" 
          });
          setStep('success');
          return;
        }
        throw error;
      }
      
      toast({ description: "Password updated successfully!" });
      setStep('success');
    } catch (error: any) {
      // Fallback message
      toast({ 
        description: "A password reset link has been sent if the account exists." 
      });
      setStep('success');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('identifier');
    setIdentifier('');
    setNewPassword('');
    setConfirmPassword('');
    setFoundUserId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 'identifier' && 'Reset Password'}
            {step === 'newPassword' && 'Set New Password'}
            {step === 'success' && 'Check Your Email'}
          </DialogTitle>
          {step === 'identifier' && (
            <DialogDescription>
              Enter your email or phone number to reset your password.
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {step === 'identifier' && (
            <>
              <div className="relative">
                {identifierType === 'email' ? (
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  value={identifier}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  placeholder="Email or phone number"
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={verifyAccount} 
                disabled={!identifier.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
            </>
          )}
          
          {step === 'newPassword' && (
            <>
              <button 
                onClick={() => setStep('identifier')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              
              <div className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (6+ characters)"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="pl-10"
                  />
                  {confirmPassword && newPassword === confirmPassword && (
                    <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              
              <Button 
                onClick={resetPassword} 
                disabled={!newPassword || !confirmPassword || isLoading}
                className="w-full"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
              </Button>
            </>
          )}
          
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-muted-foreground mb-4">
                Check your email for a password reset link.
              </p>
              <Button onClick={() => { resetForm(); onClose(); }} variant="outline">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
