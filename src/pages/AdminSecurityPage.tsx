import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BellOff, Bell, Check, ShieldAlert, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type Snapshot = {
  finding_hash: string;
  level: string;
  name: string;
  payload: Record<string, unknown> | null;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged: boolean;
  muted: boolean;
  acknowledged_at: string | null;
};

type Alert = {
  id: string;
  kind: string;
  severity: string;
  message: string;
  details: Record<string, unknown> | null;
  acknowledged: boolean;
  created_at: string;
};

const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

const levelTone = (level: string) =>
  level === 'error' ? 'destructive' : level === 'warn' || level === 'warning' ? 'default' : 'secondary';

function fmt(ts: string) {
  return new Date(ts).toLocaleString();
}

export default function AdminSecurityPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('diffs');

  const snapshots = useQuery({
    queryKey: ['security-snapshots'],
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from('security_scan_snapshots')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Snapshot[];
    },
  });

  const alerts = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async (): Promise<Alert[]> => {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Alert[];
    },
  });

  const updateSnapshot = useMutation({
    mutationFn: async ({ hash, patch }: { hash: string; patch: Partial<Snapshot> }) => {
      const { error } = await supabase
        .from('security_scan_snapshots')
        .update({
          ...patch,
          acknowledged_at: new Date().toISOString(),
        } as never)
        .eq('finding_hash', hash);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security-snapshots'] }),
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const ackAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admin_alerts').update({ acknowledged: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security-alerts'] }),
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const { fresh, existing } = useMemo(() => {
    const rows = snapshots.data ?? [];
    const cutoff = Date.now() - NEW_WINDOW_MS;
    return {
      fresh: rows.filter((r) => new Date(r.first_seen_at).getTime() >= cutoff && !r.muted),
      existing: rows.filter((r) => new Date(r.first_seen_at).getTime() < cutoff || r.muted),
    };
  }, [snapshots.data]);

  const renderRow = (row: Snapshot) => (
    <Card key={row.finding_hash} className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={levelTone(row.level) as 'default' | 'secondary' | 'destructive'}>
              {row.level.toUpperCase()}
            </Badge>
            <span className="font-semibold truncate">{row.name}</span>
            {row.muted && <Badge variant="outline">Muted</Badge>}
            {row.acknowledged && <Badge variant="outline">Acknowledged</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            First seen {fmt(row.first_seen_at)} · Last seen {fmt(row.last_seen_at)}
          </p>
          {typeof row.payload?.description === 'string' && (
            <p className="text-sm text-muted-foreground mt-2">{row.payload.description as string}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button
            size="sm"
            variant={row.acknowledged ? 'outline' : 'default'}
            onClick={() => updateSnapshot.mutate({ hash: row.finding_hash, patch: { acknowledged: !row.acknowledged } })}
          >
            <Check className="h-4 w-4 mr-1" />
            {row.acknowledged ? 'Unacknowledge' : 'Acknowledge'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateSnapshot.mutate({ hash: row.finding_hash, patch: { muted: !row.muted } })}
          >
            {row.muted ? <Bell className="h-4 w-4 mr-1" /> : <BellOff className="h-4 w-4 mr-1" />}
            {row.muted ? 'Unmute' : 'Mute'}
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" /> Security scans
          </h1>
          <p className="text-xs text-muted-foreground">New vs. known findings, with acknowledge and mute</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh"
          onClick={() => {
            snapshots.refetch();
            alerts.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </header>

      <main className="px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="diffs" className="flex-1">New ({fresh.length})</TabsTrigger>
            <TabsTrigger value="known" className="flex-1">Known ({existing.length})</TabsTrigger>
            <TabsTrigger value="alerts" className="flex-1">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="diffs" className="space-y-3 mt-4">
            {snapshots.isLoading && <Skeleton className="h-24 w-full" />}
            {!snapshots.isLoading && fresh.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                No new findings in the last 24 hours.
              </p>
            )}
            {fresh.map(renderRow)}
          </TabsContent>

          <TabsContent value="known" className="space-y-3 mt-4">
            {existing.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No previously seen findings.</p>
            )}
            {existing.map(renderRow)}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-3 mt-4">
            {alerts.isLoading && <Skeleton className="h-24 w-full" />}
            {(alerts.data ?? []).length === 0 && !alerts.isLoading && (
              <p className="text-sm text-muted-foreground text-center py-10">No alerts recorded.</p>
            )}
            {(alerts.data ?? []).map((a) => (
              <Card key={a.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={a.severity === 'error' || a.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {a.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{a.kind}</span>
                  </div>
                  <p className="text-sm font-medium mt-1">{a.message}</p>
                  <p className="text-xs text-muted-foreground">{fmt(a.created_at)}</p>
                </div>
                {!a.acknowledged ? (
                  <Button size="sm" variant="outline" onClick={() => ackAlert.mutate(a.id)}>
                    <Check className="h-4 w-4 mr-1" /> Acknowledge
                  </Button>
                ) : (
                  <Badge variant="outline">Acknowledged</Badge>
                )}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
