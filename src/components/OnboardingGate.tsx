import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ConffoOnboarding } from "@/components/ConffoOnboarding";

export function OnboardingGate() {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setOpen(!!isAuthenticated && !!user && user.onboardingCompleted === false);
  }, [isAuthenticated, isLoading, user]);

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
