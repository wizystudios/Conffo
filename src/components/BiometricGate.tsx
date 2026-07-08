import { useEffect, useState } from "react";
import { Fingerprint, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  isBiometricEnabled,
  isSessionUnlocked,
  unlockWithBiometric,
  disableBiometric,
} from "@/lib/biometric/passkey";

/**
 * Blocks the app until the user completes a biometric unlock, on devices
 * where they've opted in. If biometrics aren't set up for this user, this
 * gate is a no-op. If unlock fails (e.g. the credential was removed on the
 * OS side), the user can sign out and start over.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) { setNeedsUnlock(false); return; }
    if (isBiometricEnabled(user.id) && !isSessionUnlocked(user.id)) {
      setNeedsUnlock(true);
    } else {
      setNeedsUnlock(false);
    }
  }, [user?.id]);

  const handleUnlock = async () => {
    if (!user?.id) return;
    setError(null);
    setBusy(true);
    try {
      const ok = await unlockWithBiometric(user.id);
      if (ok) setNeedsUnlock(false);
      else setError("Unlock cancelled. Try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Biometric unlock failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = () => {
    if (!user?.id) return;
    disableBiometric(user.id);
    setNeedsUnlock(false);
  };

  if (!needsUnlock) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-primary">
        <Fingerprint className="h-12 w-12 text-white" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold">Unlock Conffo</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Use Face ID, Touch ID, or your device biometric to continue.
      </p>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <Button onClick={handleUnlock} disabled={busy} className="w-full max-w-xs">
        {busy ? "Waiting…" : "Unlock"}
      </Button>
      <div className="mt-6 flex gap-4 text-xs text-muted-foreground">
        <button className="underline" onClick={handleDisable}>Turn off biometrics</button>
        <button className="flex items-center gap-1 underline" onClick={signOut}>
          <LogOut className="h-3 w-3" /> Sign out
        </button>
      </div>
    </div>
  );
}
