import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Plus, Smartphone, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type Device = {
  id: string;
  device_label: string | null;
  status: string;
  created_at: string;
  claimed_at: string | null;
  expires_at: string;
};

async function callDeviceLink<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('device-link', { body });
  if (error) throw new Error(error.message);
  const res = data as T & { error?: string };
  if (res && typeof res === 'object' && 'error' in res && res.error) throw new Error(String(res.error));
  return res as T;
}

/** Turn a raw user-agent string into something a person can recognise. */
function friendlyName(label: string | null): string {
  if (!label) return 'Unknown device';
  const ua = label;
  const os =
    /iPhone|iPad/i.test(ua) ? 'iPhone / iPad'
    : /Android/i.test(ua) ? 'Android phone'
    : /Mac OS X/i.test(ua) ? 'Mac'
    : /Windows/i.test(ua) ? 'Windows PC'
    : /Linux/i.test(ua) ? 'Linux computer'
    : 'Device';
  const browser =
    /Edg\//i.test(ua) ? 'Edge'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Firefox\//i.test(ua) ? 'Firefox'
    : /Safari\//i.test(ua) ? 'Safari'
    : null;
  return browser ? `${os} · ${browser}` : os;
}

const statusTone = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' =>
  s === 'claimed' ? 'default' : s === 'revoked' ? 'destructive' : 'outline';

const statusLabel = (s: string) =>
  s === 'claimed' ? 'Linked' : s === 'pending' ? 'Waiting for code' : s === 'revoked' ? 'Revoked' : 'Expired';

export default function LinkedDevicesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const devices = useQuery({
    queryKey: ['linked-devices'],
    queryFn: async () => (await callDeviceLink<{ devices: Device[] }>({ action: 'list_devices' })).devices,
    enabled: isAuthenticated,
  });

  const revoke = useMutation({
    mutationFn: (id: string) => callDeviceLink({ action: 'revoke_device', id, sign_out_others: true }),
    onSuccess: () => {
      toast({ title: 'Device revoked', description: 'That device has been signed out.' });
      queryClient.invalidateQueries({ queryKey: ['linked-devices'] });
    },
    onError: (e: Error) => toast({ title: 'Could not revoke', description: e.message, variant: 'destructive' }),
  });

  const list = devices.data ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" /> Linked devices
          </h1>
          <p className="text-xs text-muted-foreground">Every device connected to your anonymous profile</p>
        </div>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto space-y-3">
        {!isAuthenticated && (
          <p className="text-sm text-muted-foreground text-center py-10">Sign in to see your devices.</p>
        )}

        {isAuthenticated && devices.isLoading && <Skeleton className="h-24 w-full" />}

        {isAuthenticated && !devices.isLoading && list.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No other devices yet. Link one to carry your profile with you.
          </p>
        )}

        {list.map((d) => (
          <Card key={d.id} className="p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">{friendlyName(d.device_label)}</span>
                <Badge variant={statusTone(d.status)}>{statusLabel(d.status)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {d.claimed_at
                  ? `Linked ${new Date(d.claimed_at).toLocaleString()}`
                  : `Code created ${new Date(d.created_at).toLocaleString()}`}
              </p>
            </div>
            {d.status !== 'revoked' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => revoke.mutate(d.id)}
                disabled={revoke.isPending}
              >
                {revoke.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Revoke
              </Button>
            )}
          </Card>
        ))}

        {isAuthenticated && (
          <Button className="w-full h-11" onClick={() => navigate('/link-device')}>
            <Plus className="h-4 w-4 mr-2" /> Link a new device
          </Button>
        )}
      </main>
    </div>
  );
}
