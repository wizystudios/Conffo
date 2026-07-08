import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  isBiometricEnabled,
  isPlatformAuthenticatorAvailable,
  registerBiometric,
} from "@/lib/biometric/passkey";
import { useToast } from "@/hooks/use-toast";

const dismissedKey = (userId: string) => `conffo_biometric_prompt_dismissed_${userId}`;

/**
 * Offers one-tap biometric enrollment the first time a signed-in user reaches
 * the app on a device that supports it. Dismiss = never ask again on this
 * device; user can re-enable from settings later.
 */
export function BiometricSetupPrompt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (isBiometricEnabled(user.id)) return;
    if (localStorage.getItem(dismissedKey(user.id))) return;
    let cancelled = false;
    isPlatformAuthenticatorAvailable().then((ok) => {
      if (!cancelled && ok) {
        // Small delay so the sign-in flow can finish first.
        setTimeout(() => setOpen(true), 1200);
      }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleEnable = async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      await registerBiometric(user.id, user.username ?? user.email ?? "user");
      toast({ title: "Biometrics enabled", description: "Unlock Conffo with Face ID or Touch ID next time." });
      setOpen(false);
    } catch (e) {
      toast({
        title: "Couldn't enable biometrics",
        description: e instanceof Error ? e.message : "Try again from your profile.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleLater = () => {
    if (user?.id) localStorage.setItem(dismissedKey(user.id), "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? handleLater() : setOpen(true))}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary">
            <Fingerprint className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-center">Sign in faster next time</DialogTitle>
          <DialogDescription className="text-center">
            Use Face ID, Touch ID, or your device biometric to unlock Conffo — no password.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button onClick={handleEnable} disabled={busy} className="w-full">
            {busy ? "Setting up…" : "Enable biometrics"}
          </Button>
          <Button variant="ghost" onClick={handleLater} className="w-full">Not now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
