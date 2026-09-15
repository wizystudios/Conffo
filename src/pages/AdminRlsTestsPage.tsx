import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, ExternalLink, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadCsv } from '@/utils/csv';

type Failure = { name?: string; message?: string };

type Run = {
  id: string;
  run_label: string;
  status: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  failures: Failure[] | null;
  details_url: string | null;
  commit_sha: string | null;
  created_at: string;
};

export default function AdminRlsTestsPage() {
  const navigate = useNavigate();

  const runs = useQuery({
    queryKey: ['rls-test-runs'],
    queryFn: async (): Promise<Run[]> => {
      const { data, error } = await supabase
        .from('rls_test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Run[];
    },
  });

  const rows = runs.data ?? [];
  const latest = rows[0];
  const passed = latest?.status === 'passed';

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Access-rule test runs
          </h1>
          <p className="text-xs text-muted-foreground">Automated checks that data stays private</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => runs.refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {runs.isLoading && <Skeleton className="h-28 w-full" />}

        {!runs.isLoading && !latest && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No test runs recorded yet. Results appear here after the automated checks run.
          </p>
        )}

        {latest && (
          <Card className={`p-5 space-y-2 ${passed ? 'border-primary/40' : 'border-destructive/50'}`}>
            <div className="flex items-center gap-2">
              {passed ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
              <span className="text-xl font-bold">{passed ? 'All checks passed' : 'Checks failed'}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {latest.passed_checks} passed · {latest.failed_checks} failed · {latest.total_checks} total
            </p>
            <p className="text-xs text-muted-foreground">
              {latest.run_label} · {new Date(latest.created_at).toLocaleString()}
              {latest.commit_sha ? ` · ${latest.commit_sha.slice(0, 7)}` : ''}
            </p>

            {(latest.failures ?? []).length > 0 && (
              <ul className="text-sm space-y-1 pt-2">
                {(latest.failures ?? []).map((f, i) => (
                  <li key={i} className="rounded-lg bg-destructive/10 px-3 py-2">
                    <span className="font-medium">{f.name ?? 'Check'}</span>
                    {f.message ? <span className="block text-xs text-muted-foreground">{f.message}</span> : null}
                  </li>
                ))}
              </ul>
            )}

            {latest.details_url && (
              <Button asChild variant="outline" size="sm" className="mt-2">
                <a href={latest.details_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Open full run log
                </a>
              </Button>
            )}
          </Card>
        )}

        {rows.length > 1 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    `conffo-rls-test-runs-${new Date().toISOString().slice(0, 10)}.csv`,
                    rows.map((r) => ({
                      created_at: r.created_at,
                      run_label: r.run_label,
                      status: r.status,
                      total_checks: r.total_checks,
                      passed_checks: r.passed_checks,
                      failed_checks: r.failed_checks,
                      commit_sha: r.commit_sha ?? '',
                      details_url: r.details_url ?? '',
                    })),
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            {rows.slice(1).map((r) => (
              <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'passed' ? 'secondary' : 'destructive'}>{r.status}</Badge>
                    <span className="text-sm font-medium truncate">{r.run_label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                {r.details_url && (
                  <a
                    href={r.details_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary font-medium shrink-0"
                  >
                    Details
                  </a>
                )}
              </Card>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
