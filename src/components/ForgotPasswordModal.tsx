import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, Phone, Lock, Check, ArrowLeft } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'identifier' | 'newPassword' | 'success';

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
  const isPhone = (v: string) => /^\+?[\d\s-]{10,}$/.test(v.replace(/\s/g, ''));

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    if (isEmail(value)) setIdentifierType('email');
    else if (isPhone(value)) setIdentifierType('phone');
  };

  const verifyAccount = async () => {
    if (!identifier.trim()) return;
    setIsLoading(true);
    try {
      if (identifierType === 'email') {
        // Always send reset link to the production Conffo URL — never localhost.
        const PRODUCTION_URL = 'https://conffo.lovable.app';
        const origin = window.location.hostname.includes('localhost')
          ? PRODUCTION_URL
          : window.location.origin;
        const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
          redirectTo: `${origin}/auth?type=recovery`,
        });
        if (error) throw error;
        toast({ description: 'Password reset link sent. Check your inbox.' });
        setStep('success');
      } else {
        const { data } = await supabase.rpc(
          'find_login_identity' as never,
          { identifier: identifier.replace(/\s/g, '') } as never,
        );
        const hit: any = Array.isArray(data as any) ? (data as any)[0] : (data as any);
        if (hit?.user_id) setStep('newPassword');
        else toast({ variant: 'destructive', description: 'No account found with this phone number' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', description: e?.message || 'Failed to verify account' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 8) {
      toast({ variant: 'destructive', description: 'Password must be at least 8 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', description: "Passwords don't match" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ description: 'Password updated successfully!' });
      setStep('success');
    } catch (e: any) {
      toast({ description: 'A password reset link has been sent if the account exists.' });
      setStep('success');
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => {
    setStep('identifier');
    setIdentifier('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col px-6 pt-6 pb-10">
      <button
        onClick={close}
        aria-label="Back"
        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-95 transition-transform"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="flex-1 w-full max-w-sm mx-auto pt-8">
        <h1 className="text-2xl font-bold tracking-tight text-center text-foreground">
          {step === 'identifier' && 'Reset password'}
          {step === 'newPassword' && 'Set new password'}
          {step === 'success' && 'Check your email'}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {step === 'identifier' && 'Enter your email or phone number.'}
          {step === 'newPassword' && 'Choose a new password for your account.'}
          {step === 'success' && "We've sent a reset link to your email."}
        </p>

        <div className="pt-10 space-y-6">
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
                  className="pl-10 h-12"
                  autoFocus
                />
              </div>
              <Button onClick={verifyAccount} disabled={!identifier.trim() || isLoading} className="w-full h-12 text-base font-semibold">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (8+ characters)" className="pl-10 h-12" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="pl-10 h-12" />
                {confirmPassword && newPassword === confirmPassword && (
                  <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                )}
              </div>
              <Button onClick={resetPassword} disabled={!newPassword || !confirmPassword || isLoading} className="w-full h-12 text-base font-semibold">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
              </Button>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-primary">
                <Check className="h-7 w-7 text-primary-foreground" />
              </div>
              <Button onClick={close} className="w-full h-12 text-base font-semibold">Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
