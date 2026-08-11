import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Copy, KeyRound, Loader2, QrCode, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const FN = 'device-link';

async function callDeviceLink<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FN, { body });
  if (error) throw new Error(error.message);
  const res = data as T & { error?: string };
  if (res && typeof res === 'object' && 'error' in res && res.error) throw new Error(String(res.error));
  return res as T;
}

export default function LinkDevicePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(isAuthenticated ? 'share' : 'claim');

  // Share side (trusted, signed-in device)
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [genning, setGenning] = useState(false);

  // Claim side (new device)
  const [entered, setEntered] = useState((params.get('code') ?? '').toUpperCase());
  const [recoveryInput, setRecoveryInput] = useState('');
  const [claiming, setClaiming] = useState(false);
  const autoTried = useRef(false);

  const createCode = async () => {
    setCreating(true);
    try {
      const res = await callDeviceLink<{ code: string; expires_at: string }>({
        action: 'create_code',
        device_label: navigator.userAgent.slice(0, 100),
      });
      setCode(res.code);
      setExpiresAt(res.expires_at);
      const url = `${window.location.origin}/link-device?code=${res.code}`;
      setQr(await QRCode.toDataURL(url, { width: 240, margin: 1 }));
    } catch (e) {
      toast({ title: 'Could not create code', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const genRecovery = async () => {
    setGenning(true);
    try {
      const res = await callDeviceLink<{ codes: string[] }>({ action: 'gen_recovery', count: 5 });
      setRecoveryCodes(res.codes);
    } catch (e) {
      toast({ title: 'Could not generate codes', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setGenning(false);
    }
  };

  const exchange = async (action: 'claim_code' | 'redeem_recovery', value: string) => {
    setClaiming(true);
    try {
      const res = await callDeviceLink<{ token_hash: string }>({ action, code: value });
      const { error } = await supabase.auth.verifyOtp({ token_hash: res.token_hash, type: 'magiclink' });
      if (error) throw error;
      toast({ title: 'Device linked', description: 'You are signed in on this device.' });
      navigate('/', { replace: true });
    } catch (e) {
      toast({ title: 'Link failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setClaiming(false);
    }
  };

  // Deep link from the QR code: attempt the exchange automatically once.
  useEffect(() => {
    const incoming = params.get('code');
    if (incoming && !isAuthenticated && !autoTried.current) {
      autoTried.current = true;
      setTab('claim');
      exchange('claim_code', incoming.toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, isAuthenticated]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" /> Link this device
          </h1>
          <p className="text-xs text-muted-foreground">Move your anonymous profile to another device, safely</p>
        </div>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="share" className="flex-1" disabled={!isAuthenticated}>
              Share code
            </TabsTrigger>
            <TabsTrigger value="claim" className="flex-1">
              Use a code
            </TabsTrigger>
          </TabsList>

          {/* ── Trusted device: create a code / QR + recovery codes ── */}
          <TabsContent value="share" className="mt-4 space-y-4">
            {!isAuthenticated ? (
              <p className="text-sm text-muted-foreground">Sign in first to share a link code.</p>
            ) : (
              <>
                <Card className="p-5 space-y-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <QrCode className="h-4 w-4 text-primary" /> Scan or type this code
                  </div>
                  {qr ? (
                    <img src={qr} alt="QR code to link a new device" className="mx-auto rounded-xl" />
                  ) : (
                    <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                      Generate a one-time code to begin
                    </div>
                  )}
                  {code && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => copy(code)}
                        className="text-2xl font-bold tracking-[0.3em] text-primary"
                      >
                        {code}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        Single use · expires {expiresAt ? new Date(expiresAt).toLocaleTimeString() : 'in 10 minutes'}
                      </p>
                    </div>
                  )}
                  <Button onClick={createCode} disabled={creating} className="w-full">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {code ? 'New code' : 'Generate code'}
                  </Button>
                </Card>

                <Card className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-4 w-4 text-primary" /> Recovery codes
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Keep these somewhere safe. Each code unlocks your account once on a new device if you lose access to
                    your passkey.
                  </p>
                  {recoveryCodes && (
                    <div className="grid grid-cols-1 gap-1 font-mono text-sm bg-muted rounded-lg p-3">
                      {recoveryCodes.map((c) => (
                        <button key={c} type="button" onClick={() => copy(c)} className="text-left">
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" onClick={genRecovery} disabled={genning} className="w-full">
                    {genning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {recoveryCodes ? 'Regenerate codes' : 'Generate recovery codes'}
                  </Button>
                  {recoveryCodes && (
                    <p className="text-[11px] text-muted-foreground">
                      Shown once. Regenerating invalidates any unused codes.
                    </p>
                  )}
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── New device: enter a link code or a recovery code ── */}
          <TabsContent value="claim" className="mt-4 space-y-4">
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" /> Link code
              </div>
              <Input
                value={entered}
                onChange={(e) => setEntered(e.target.value.toUpperCase())}
                placeholder="ABCD2345"
                maxLength={8}
                className="text-center text-xl tracking-[0.25em] h-12"
                aria-label="Link code"
              />
              <Button
                className="w-full h-11"
                disabled={claiming || entered.length !== 8}
                onClick={() => exchange('claim_code', entered)}
              >
                {claiming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Link this device
              </Button>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-4 w-4 text-primary" /> Recovery code
              </div>
              <Input
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="text-center tracking-widest h-12"
                aria-label="Recovery code"
              />
              <Button
                variant="outline"
                className="w-full h-11"
                disabled={claiming || recoveryInput.length < 12}
                onClick={() => exchange('redeem_recovery', recoveryInput)}
              >
                {claiming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Recover my account
              </Button>
            </Card>

            {user && (
              <p className="text-xs text-muted-foreground text-center">
                You are already signed in on this device.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
