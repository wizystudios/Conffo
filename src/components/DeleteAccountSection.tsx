import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

/**
 * Permanent account deletion: requires re-entering password, then calls the
 * `delete-account` edge function which cascades public data and deletes the
 * auth user. After success we sign out and redirect to the welcome page.
 */
export function DeleteAccountSection() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const canDelete = password.length >= 8 && confirmText.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!user?.email || !canDelete) return;
    setLoading(true);
    try {
      // Re-auth with password — never call the edge function without it.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInErr) throw new Error('Incorrect password');

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Session expired');

      const { error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;

      toast({ description: 'Your account has been permanently deleted.' });
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/';
    } catch (e: any) {
      toast({ variant: 'destructive', description: e?.message || 'Failed to delete account' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Permanently delete your Conffo account and all data: confessions, comments,
          messages, fans, crew, and saved items. This action cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your Conffo account?</AlertDialogTitle>
              <AlertDialogDescription>
                This is permanent. To continue, enter your password and type DELETE.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 py-2">
              <Input
                type="password"
                placeholder="Current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Input
                placeholder='Type "DELETE" to confirm'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!canDelete || loading}
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                className="bg-destructive hover:bg-destructive/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Permanently delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
