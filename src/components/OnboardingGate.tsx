import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ConffoOnboarding } from "@/components/ConffoOnboarding";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shows the onboarding flow only when needed.
 * Skips it (and silently marks onboarding complete in the DB) when the user
 * already has a real username from registration — so we never ask
 * "what should we call you?" twice.
 */
export function OnboardingGate() {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) {
      setOpen(false);
      return;
    }

    if (user.onboardingCompleted) {
      setOpen(false);
      return;
    }

    // If the username was supplied at signup, auto-complete onboarding.
    const emailLocal = user.email?.split('@')[0];
    const hasRealUsername =
      !!user.username && user.username !== 'User' && user.username !== emailLocal;

    if (hasRealUsername) {
      supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
        .then(() => { refreshUser(); });
      setOpen(false);
      return;
    }

    setOpen(true);
  }, [isAuthenticated, isLoading, user, refreshUser]);

  if (!open) return null;

  return (
    <ConffoOnboarding
      onComplete={async () => {
        setOpen(false);
        await refreshUser();
      }}
    />
  );
}
