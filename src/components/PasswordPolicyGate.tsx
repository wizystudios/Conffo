import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const REQUIRED_POLICY_VERSION = 2;

/**
 * Forces a one-time password reset on first login when the user's
 * password_policy_version is below REQUIRED_POLICY_VERSION.
 *
 * Policy v2: at least 8 characters, mix of upper/lower + 1 number.
 */
export function PasswordPolicyGate() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!isAuthenticated || !user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('password_policy_version')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const v = data?.password_policy_version ?? 1;
      if (v < REQUIRED_POLICY_VERSION) setOpen(true);
    };
    check();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  const validate = (p: string): string | null => {
    if (p.length < 8) return 'At least 8 characters';
    if (!/[A-Z]/.test(p)) return 'Add 1 uppercase letter';
    if (!/[a-z]/.test(p)) return 'Add 1 lowercase letter';
    if (!/\d/.test(p)) return 'Add 1 number';
    return null;
  };

  const handleSave = async () => {
    setError(null);
    const issue = validate(password);
    if (issue) { setError(issue); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setBusy(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      await supabase.from('profiles').update({
        password_policy_version: REQUIRED_POLICY_VERSION,
        password_policy_updated_at: new Date().toISOString(),
      }).eq('id', user!.id);
      await refreshUser();
      toast({ description: 'Password updated' });
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to update password');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* locked until updated */ }}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Update your password</DialogTitle>
        </DialogHeader>
        <p className="text-center text-sm text-muted-foreground -mt-2">
          We've strengthened our password policy. Please set a new password to keep your account safe.
        </p>
        <div className="space-y-3 mt-2">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            8+ chars, with upper & lowercase letters and a number.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleSave} disabled={busy || !password || !confirm}>
            {busy ? 'Saving…' : 'Save & continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
