import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Copy, Download, KeyRound, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type Status = {
  total: number;
  unused: number;
  used: number;
  last_used_at: string | null;
  generated_at: string | null;
};

async function callDeviceLink<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('device-link', { body });
  if (error) throw new Error(error.message);
  const res = data as T & { error?: string };
  if (res && typeof res === 'object' && 'error' in res && res.error) throw new Error(String(res.error));
  return res as T;
}

export default function RecoveryCodesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  const status = useQuery({
    queryKey: ['recovery-status'],
    queryFn: () => callDeviceLink<Status>({ action: 'recovery_status' }),
    enabled: isAuthenticated,
  });

  const generate = useMutation({
    mutationFn: () => callDeviceLink<{ codes: string[] }>({ action: 'gen_recovery', count: 5 }),
    onSuccess: (res) => {
      setCodes(res.codes);
      setSaved(false);
      queryClient.invalidateQueries({ queryKey: ['recovery-status'] });
    },
    onError: (e: Error) => toast({ title: 'Could not create codes', description: e.message, variant: 'destructive' }),
  });

  const copyAll = async () => {
    if (!codes) return;
    await navigator.clipboard.writeText(codes.join('\n'));
    toast({ title: 'Codes copied' });
  };

  const download = () => {
    if (!codes) return;
    const blob = new Blob([`Conffo recovery codes\n\n${codes.join('\n')}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conffo-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = status.data;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Recovery codes
          </h1>
          <p className="text-xs text-muted-foreground">Get back into your account on any device</p>
        </div>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto space-y-4">
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground text-center py-10">Sign in to manage recovery codes.</p>
        ) : (
          <>
            <Card className="p-5 space-y-2">
              {status.isLoading && <Skeleton className="h-12 w-full" />}
              {s && (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{s.unused}</span>
                    <span className="text-sm text-muted-foreground">of {s.total || 0} codes still usable</span>
                  </div>
                  {s.generated_at && (
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(s.generated_at).toLocaleString()}
                    </p>
                  )}
                  {s.used > 0 && (
                    <p className="text-xs flex items-center gap-1 text-primary font-medium">
                      <Check className="h-3.5 w-3.5" />
                      {s.used} code{s.used > 1 ? 's' : ''} already used
                      {s.last_used_at ? ` · last on ${new Date(s.last_used_at).toLocaleString()}` : ''}
                    </p>
                  )}
                  {s.total === 0 && (
                    <p className="text-xs text-muted-foreground">
                      You have no recovery codes yet. Create a set and keep it somewhere safe.
                    </p>
                  )}
                </>
              )}
            </Card>

            {codes && (
              <Card className="p-5 space-y-3 border-primary/40">
                <p className="text-sm font-semibold">Your new codes — shown only once</p>
                <div className="grid gap-1 font-mono text-sm bg-muted rounded-lg p-3">
                  {codes.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={copyAll}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={download}>
                    <Download className="h-4 w-4 mr-2" /> Save file
                  </Button>
                </div>
                <Button className="w-full" variant={saved ? 'outline' : 'default'} onClick={() => setSaved(true)}>
                  <Check className="h-4 w-4 mr-2" /> {saved ? 'Saved' : "I've stored them safely"}
                </Button>
                {saved && (
                  <p className="text-xs text-muted-foreground">
                    Each code works once. When you use one, it will show as used on this screen.
                  </p>
                )}
              </Card>
            )}

            <Button className="w-full h-11" onClick={() => generate.mutate()} disabled={generate.isPending}>
              {generate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {s && s.total > 0 ? 'Create new codes' : 'Create recovery codes'}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Creating new codes cancels any unused older ones.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
