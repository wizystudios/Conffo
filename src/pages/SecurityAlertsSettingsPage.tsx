import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, BellOff, Check, Download, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { downloadCsv } from '@/utils/csv';

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

export default function SecurityAlertsSettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const update = useMutation({
    mutationFn: async ({ hash, patch }: { hash: string; patch: Partial<Snapshot> }) => {
      const { error } = await supabase
        .from('security_scan_snapshots')
        .update({ ...patch, acknowledged_at: new Date().toISOString() } as never)
        .eq('finding_hash', hash);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security-snapshots'] }),
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const rows = snapshots.data ?? [];
  const counts = useMemo(
    () => ({
      total: rows.length,
      open: rows.filter((r) => !r.acknowledged && !r.muted).length,
      acknowledged: rows.filter((r) => r.acknowledged).length,
      muted: rows.filter((r) => r.muted).length,
    }),
    [rows],
  );

  const exportHistory = () => {
    const ok = downloadCsv(
      `conffo-security-history-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => ({
        name: r.name,
        level: r.level,
        first_seen_at: r.first_seen_at,
        last_seen_at: r.last_seen_at,
        acknowledged: r.acknowledged,
        acknowledged_at: r.acknowledged_at ?? '',
        muted: r.muted,
        description: typeof r.payload?.description === 'string' ? r.payload.description : '',
      })),
    );
    if (!ok) toast({ title: 'Nothing to export yet' });
  };

  const bulk = (patch: Partial<Snapshot>) => {
    rows.forEach((r) => update.mutate({ hash: r.finding_hash, patch }));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" /> Security alerts
          </h1>
          <p className="text-xs text-muted-foreground">Acknowledge, mute and export your scan history</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Export history" onClick={exportHistory}>
          <Download className="h-4 w-4" />
        </Button>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 grid grid-cols-4 gap-2 text-center">
          {[
            ['Total', counts.total],
            ['Open', counts.open],
            ['Acked', counts.acknowledged],
            ['Muted', counts.muted],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="text-2xl font-bold">{value as number}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label as string}</p>
            </div>
          ))}
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => bulk({ acknowledged: true })}>
            <Check className="h-4 w-4 mr-1" /> Acknowledge all
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => bulk({ muted: false })}>
            <Bell className="h-4 w-4 mr-1" /> Unmute all
          </Button>
        </div>

        {snapshots.isLoading && <Skeleton className="h-24 w-full" />}
        {!snapshots.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">No scan findings recorded yet.</p>
        )}

        {rows.map((r) => (
          <Card key={r.finding_hash} className="p-4 space-y-3">
            <div className="flex items-start gap-2 justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={r.level === 'error' ? 'destructive' : 'secondary'}>{r.level.toUpperCase()}</Badge>
                  <span className="font-semibold truncate">{r.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  First seen {new Date(r.first_seen_at).toLocaleString()} · last seen{' '}
                  {new Date(r.last_seen_at).toLocaleString()}
                </p>
              </div>
              {r.muted ? <BellOff className="h-4 w-4 text-muted-foreground shrink-0" /> : null}
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2" htmlFor={`ack-${r.finding_hash}`}>
                <Switch
                  id={`ack-${r.finding_hash}`}
                  checked={r.acknowledged}
                  onCheckedChange={(v) => update.mutate({ hash: r.finding_hash, patch: { acknowledged: v } })}
                />
                Acknowledged
              </label>
              <label className="flex items-center gap-2" htmlFor={`mute-${r.finding_hash}`}>
                <Switch
                  id={`mute-${r.finding_hash}`}
                  checked={r.muted}
                  onCheckedChange={(v) => update.mutate({ hash: r.finding_hash, patch: { muted: v } })}
                />
                Muted
              </label>
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
