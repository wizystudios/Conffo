// Admin audit & alerts dashboard.
// - Password reset audit (filter + CSV export)
// - Moderation action audit (dismiss/delete/warn/temp_ban)
// - Admin alerts (rate-limit / brute-force)
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Download, Shield, BellRing, KeyRound } from "lucide-react";

type ResetRow = {
  id: string;
  created_at: string;
  requestor_email: string | null;
  target_email: string;
  method: string;
  delivery_status: string;
  ip_address: string | null;
  error: string | null;
};

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAuditPage() {
  const { user, isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [emailFilter, setEmailFilter] = useState<string>("");

  const { data: resets = [], isLoading: loadingResets } = useQuery({
    queryKey: ["password_reset_audit"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("password_reset_audit" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ResetRow[];
    },
  });

  const { data: moderation = [] } = useQuery({
    queryKey: ["admin_moderation_audit"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_moderation_audit" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string; admin_email: string | null; action: string;
        target_user_id: string | null; created_at: string; details: unknown;
      }>;
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["admin_alerts"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_alerts" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string; kind: string; severity: string; message: string;
        acknowledged: boolean; created_at: string;
      }>;
    },
  });

  const filteredResets = useMemo(() => {
    return resets.filter((r) => {
      if (statusFilter && r.delivery_status !== statusFilter) return false;
      if (emailFilter) {
        const q = emailFilter.toLowerCase();
        const hay = `${r.requestor_email ?? ""} ${r.target_email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [resets, statusFilter, emailFilter]);

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const exportCsv = () => download(`password-reset-audit-${Date.now()}.csv`, toCsv(filteredResets as never));

  return (
    <Layout showNavBar>
      <div className="space-y-6 p-4 pt-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Admin Audit & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="resets">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="resets"><KeyRound className="h-4 w-4 mr-1" /> Password Resets</TabsTrigger>
                <TabsTrigger value="moderation"><Shield className="h-4 w-4 mr-1" /> Moderation</TabsTrigger>
                <TabsTrigger value="alerts"><BellRing className="h-4 w-4 mr-1" /> Alerts {alerts.filter(a => !a.acknowledged).length > 0 && <Badge variant="destructive" className="ml-1">{alerts.filter(a => !a.acknowledged).length}</Badge>}</TabsTrigger>
              </TabsList>

              <TabsContent value="resets" className="pt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Filter by email…"
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    className="max-w-xs"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All statuses</option>
                    <option value="sent">sent</option>
                    <option value="failed">failed</option>
                    <option value="rate_limited">rate_limited</option>
                    <option value="forbidden">forbidden</option>
                  </select>
                  <Button onClick={exportCsv} variant="outline" className="gap-1">
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
                {loadingResets ? (
                  <p className="text-muted-foreground">Loading…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3">When</th>
                          <th className="py-2 pr-3">Requestor</th>
                          <th className="py-2 pr-3">Target</th>
                          <th className="py-2 pr-3">Method</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResets.map((r) => (
                          <tr key={r.id} className="border-b">
                            <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                            <td className="py-2 pr-3">{r.requestor_email ?? "—"}</td>
                            <td className="py-2 pr-3">{r.target_email}</td>
                            <td className="py-2 pr-3">{r.method}</td>
                            <td className="py-2 pr-3">
                              <Badge variant={r.delivery_status === "sent" ? "default" : "destructive"}>{r.delivery_status}</Badge>
                            </td>
                            <td className="py-2 pr-3">{r.ip_address ?? "—"}</td>
                          </tr>
                        ))}
                        {filteredResets.length === 0 && (
                          <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No matching events.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="moderation" className="pt-4 space-y-2">
                {moderation.length === 0 && <p className="text-muted-foreground">No moderation actions yet.</p>}
                {moderation.map((m) => (
                  <Card key={m.id}><CardContent className="py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <Badge>{m.action}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1"><span className="text-muted-foreground">by</span> {m.admin_email ?? "(admin)"}</p>
                    {m.target_user_id && <p className="text-xs text-muted-foreground">target: {m.target_user_id}</p>}
                  </CardContent></Card>
                ))}
              </TabsContent>

              <TabsContent value="alerts" className="pt-4 space-y-2">
                {alerts.length === 0 && <p className="text-muted-foreground">No alerts.</p>}
                {alerts.map((a) => (
                  <Card key={a.id} className={a.acknowledged ? "opacity-60" : ""}>
                    <CardContent className="py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={a.severity === "critical" ? "destructive" : "default"}>{a.severity}</Badge>
                          <span className="font-medium">{a.kind}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-1">{a.message}</p>
                      {!a.acknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={async () => {
                            await supabase.from("admin_alerts" as never).update({ acknowledged: true } as never).eq("id", a.id);
                          }}
                        >Acknowledge</Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
