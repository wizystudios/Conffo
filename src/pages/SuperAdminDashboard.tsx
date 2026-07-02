import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Shield, Users, MessageSquare, Heart, FileText, Flag, BadgeCheck,
  UserX, UserCheck, ShieldPlus, ShieldMinus, Loader2, Ban, TrendingUp,
  Activity, ScrollText,
} from 'lucide-react';

interface AdminMetrics {
  total_users: number;
  new_users_7d: number;
  new_users_24h: number;
  banned_users: number;
  verified_users: number;
  admins: number;
  moderators: number;
  total_confessions: number;
  confessions_24h: number;
  total_comments: number;
  comments_24h: number;
  total_reactions: number;
  total_messages: number;
  messages_24h: number;
  total_communities: number;
  active_stories: number;
  pending_reports: number;
  pending_verifications: number;
  signups_14d: { day: string; count: number }[];
  top_rooms: { room: string; confessions: number }[];
}

interface AdminUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_admin: boolean;
  is_moderator: boolean;
  is_verified: boolean;
  banned_until: string | null;
  created_at: string;
}

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: metrics, isLoading: mLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_metrics' as never);
      if (error) throw error;
      return data as unknown as AdminMetrics;
    },
    enabled: !!user && isAdmin,
    refetchInterval: 30_000,
  });

  const { data: users = [], isLoading: uLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_users_admin' as never, {
        p_search: search || null, p_limit: 100, p_offset: 0,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as AdminUser[];
    },
    enabled: !!user && isAdmin,
  });

  if (!user || !isAdmin) return <Navigate to="/" replace />;

  async function act(userId: string, action: string, extra: Record<string, unknown> = {}) {
    setBusyId(userId + action);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action, userId, ...extra },
      });
      if (error || (data && (data as any).error)) {
        throw new Error(error?.message || (data as any).error);
      }
      toast({ description: `Done: ${action.replace('_', ' ')}` });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin-users'] }),
        qc.invalidateQueries({ queryKey: ['admin-metrics'] }),
      ]);
    } catch (e: any) {
      toast({ variant: 'destructive', description: e?.message || 'Action failed' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Layout showNavBar>
      <div className="space-y-6 p-4 pt-2 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Super Admin
            </h1>
            <p className="text-sm text-muted-foreground">Full control of Conffo — live metrics, users, moderation.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin"><Button variant="outline" size="sm">Moderation</Button></Link>
            <Link to="/admin/audit"><Button variant="outline" size="sm">Audit Logs</Button></Link>
          </div>
        </div>

        {mLoading || !metrics ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat icon={Users} label="Users" value={metrics.total_users} sub={`+${metrics.new_users_24h} today · +${metrics.new_users_7d} this week`} />
              <Stat icon={FileText} label="Confessions" value={metrics.total_confessions} sub={`+${metrics.confessions_24h} today`} />
              <Stat icon={MessageSquare} label="Comments" value={metrics.total_comments} sub={`+${metrics.comments_24h} today`} />
              <Stat icon={Heart} label="Reactions" value={metrics.total_reactions} />
              <Stat icon={Activity} label="Messages" value={metrics.total_messages} sub={`+${metrics.messages_24h} today`} />
              <Stat icon={TrendingUp} label="Active stories" value={metrics.active_stories} />
              <Stat icon={Flag} label="Pending reports" value={metrics.pending_reports} />
              <Stat icon={BadgeCheck} label="Verifications pending" value={metrics.pending_verifications} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Signups — last 14 days</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.signups_14d}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="day" tickFormatter={(v) => v.slice(5)} fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Top rooms by confessions</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.top_rooms}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="room" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="confessions" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat icon={Ban} label="Banned" value={metrics.banned_users} />
              <Stat icon={BadgeCheck} label="Verified" value={metrics.verified_users} />
              <Stat icon={ShieldPlus} label="Admins" value={metrics.admins} />
              <Stat icon={Shield} label="Moderators" value={metrics.moderators} />
            </div>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> User management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, email or phone…"
              className="h-10"
            />

            {uLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="divide-y">
                {users.map((u) => {
                  const banned = u.banned_until && new Date(u.banned_until) > new Date();
                  const busy = busyId?.startsWith(u.id);
                  return (
                    <div key={u.id} className="flex items-center gap-3 py-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${u.id}`} />
                        <AvatarFallback>{u.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{u.username || 'unnamed'}</span>
                          {u.is_admin && <Badge className="h-5">Admin</Badge>}
                          {u.is_moderator && <Badge variant="secondary" className="h-5">Mod</Badge>}
                          {u.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                          {banned && <Badge variant="destructive" className="h-5">Banned</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.contact_email || u.contact_phone || u.id.slice(0, 8)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {banned ? (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(u.id, 'unban')}>
                            <UserCheck className="h-3.5 w-3.5 mr-1" />Unban
                          </Button>
                        ) : (
                          <Button size="sm" variant="destructive" disabled={busy} onClick={() => act(u.id, 'ban')}>
                            <UserX className="h-3.5 w-3.5 mr-1" />Ban 7d
                          </Button>
                        )}
                        {u.is_admin ? (
                          <Button size="sm" variant="outline" disabled={busy || u.id === user.id} onClick={() => act(u.id, 'demote_admin')}>
                            <ShieldMinus className="h-3.5 w-3.5 mr-1" />Demote
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(u.id, 'promote_admin')}>
                            <ShieldPlus className="h-3.5 w-3.5 mr-1" />Make admin
                          </Button>
                        )}
                        {u.is_moderator ? (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(u.id, 'demote_moderator')}>Unmod</Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(u.id, 'promote_moderator')}>Mod</Button>
                        )}
                        {u.is_verified ? (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(u.id, 'unverify')}>Unverify</Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(u.id, 'verify')}>Verify</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No users found.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
