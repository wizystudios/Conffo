import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { WelcomeScreen } from '@/components/WelcomeScreen';

const PUBLIC_PATHS = ['/auth', '/terms', '/privacy', '/reset-password'];

/**
 * Gate that blocks every route for unauthenticated visitors.
 * - Public routes (/auth, /terms, /privacy, /reset-password) render normally.
 * - Anything else is replaced by the WelcomeScreen so the welcome page is the
 *   first and only entry point for new visitors.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p));

  if (!isAuthenticated && !isPublic) {
    if (location.pathname === '/') return <WelcomeScreen />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
