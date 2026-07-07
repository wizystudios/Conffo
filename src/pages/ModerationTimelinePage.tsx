import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface ReportRow {
  id: string;
  item_type: string;
  item_id: string;
  reason: string;
  details: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

interface AuditRow {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  created_at: string;
}

type Status = 'pending' | 'dismissed' | 'acted' | 'escalated';

function statusFor(report: ReportRow, audits: AuditRow[]): Status {
  const related = audits.filter(
    (a) => a.target_id === report.item_id || a.target_id === report.id,
  );
  if (related.some((a) => /escalat/i.test(a.action))) return 'escalated';
  if (related.some((a) => /dismiss/i.test(a.action))) return 'dismissed';
  if (report.resolved) return 'acted';
  return 'pending';
}

const STATUS_META: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: 'Under review',  color: 'text-amber-600 bg-amber-50 border-amber-200', icon: <Clock className="h-3.5 w-3.5" /> },
  acted:      { label: 'Acted on',      color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  dismissed:  { label: 'Dismissed',     color: 'text-muted-foreground bg-muted border-border', icon: <XCircle className="h-3.5 w-3.5" /> },
  escalated:  { label: 'Escalated',     color: 'text-rose-700 bg-rose-50 border-rose-200', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

export default function ModerationTimelinePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: r } = await supabase
        .from('reports')
        .select('id, item_type, item_id, reason, details, resolved, resolved_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      const ids = (r ?? []).map((x) => x.item_id);
      const { data: a } = ids.length
        ? await (supabase as any)
            .from('admin_moderation_audit')
            .select('id, action, target_type, target_id, reason, created_at')
            .in('target_id', [...ids, ...(r ?? []).map((x) => x.id)])
        : { data: [] };
      if (!cancelled) {
        setReports((r ?? []) as ReportRow[]);
        setAudits((a ?? []) as AuditRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  return (
    <Layout showNavBar={false}>
      <div className="max-w-lg mx-auto pb-20">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h1 className="text-[17px] font-bold">Your reports</h1>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold">Nothing reported yet</h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              When you report a confession, comment or message you'll see the moderation status here.
            </p>
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-3">
            {reports.map((r) => {
              const status = statusFor(r, audits);
              const meta = STATUS_META[status];
              const timeline = audits
                .filter((a) => a.target_id === r.item_id || a.target_id === r.id)
                .sort((a, b) => a.created_at.localeCompare(b.created_at));
              return (
                <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] text-muted-foreground uppercase tracking-wide">{r.item_type}</div>
                      <div className="font-semibold text-[15px] leading-tight mt-0.5 truncate">{r.reason}</div>
                      {r.details && <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{r.details}</p>}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${meta.color}`}>
                      {meta.icon}{meta.label}
                    </span>
                  </div>

                  <div className="mt-3 pl-1 border-l-2 border-border/60 space-y-2">
                    <TimelineStep label="Report submitted" at={r.created_at} active />
                    {timeline.map((a) => (
                      <TimelineStep key={a.id} label={a.action.replace(/_/g, ' ')} at={a.created_at} note={a.reason} active />
                    ))}
                    {r.resolved && !timeline.some((a) => /resolve/i.test(a.action)) && (
                      <TimelineStep label="Marked resolved" at={r.resolved_at ?? r.created_at} active />
                    )}
                    {status === 'pending' && <TimelineStep label="Awaiting moderator review" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

function TimelineStep({ label, at, note, active }: { label: string; at?: string; note?: string | null; active?: boolean }) {
  return (
    <div className="relative pl-4">
      <span className={`absolute -left-[7px] top-1.5 h-2.5 w-2.5 rounded-full ${active ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
      <div className="text-[13px] font-medium capitalize">{label}</div>
      {at && <div className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(at), { addSuffix: true })}</div>}
      {note && <div className="text-[12px] text-muted-foreground italic">"{note}"</div>}
    </div>
  );
}
