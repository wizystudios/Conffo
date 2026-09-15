import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bell, ChevronRight, KeyRound, ShieldAlert, ShieldCheck, Smartphone, UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

interface Row {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  to: string;
}

const rows: Row[] = [
  { icon: Bell, title: 'Notifications', subtitle: 'Replies, comments and trending alerts', to: '/notification-settings' },
  { icon: Smartphone, title: 'Linked devices', subtitle: 'See where you are signed in and revoke access', to: '/settings/devices' },
  { icon: KeyRound, title: 'Recovery codes', subtitle: 'One-time codes to get back in on a new device', to: '/settings/recovery' },
  { icon: UserX, title: 'Blocked people', subtitle: 'Manage who cannot reach you', to: '/blocked' },
];

const adminRows: Row[] = [
  { icon: ShieldAlert, title: 'Security alerts', subtitle: 'Acknowledge, mute and export scan history', to: '/settings/security-alerts' },
  { icon: ShieldCheck, title: 'Automated test runs', subtitle: 'Latest access-rule test results', to: '/admin/rls-tests' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const renderRow = ({ icon: Icon, title, subtitle, to }: Row) => (
    <button
      key={to}
      onClick={() => navigate(to)}
      className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/60 transition-colors"
    >
      <span className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-accent-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold truncate">{title}</span>
        <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-[28px] font-bold leading-none">Settings</h1>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto space-y-4">
        <Card className="overflow-hidden divide-y">{rows.map(renderRow)}</Card>

        {isAdmin && (
          <>
            <p className="text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wide">Admin</p>
            <Card className="overflow-hidden divide-y">{adminRows.map(renderRow)}</Card>
          </>
        )}
      </main>
    </div>
  );
}
