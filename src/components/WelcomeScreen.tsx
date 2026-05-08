import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

/**
 * Conffo welcome / landing screen.
 * Mirrors the messenger landing card from the design reference:
 * blue→purple gradient hero with chat emblem, decorative wave,
 * social-account row, primary CTA, and license link.
 *
 * Shown to every unauthenticated visitor as the first and only entry point.
 */
export function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 pt-6 pb-10">
      {/* Hero card */}
      <div className="w-full max-w-sm">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-primary text-primary-foreground p-10 pb-20 shadow-primary">
          <h1 className="text-3xl font-bold tracking-tight text-center">Conffo</h1>

          <div className="mt-10 flex items-center justify-center">
            <div className="h-20 w-20 rounded-2xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
              <MessageSquare className="h-10 w-10" strokeWidth={2.2} />
            </div>
          </div>

          {/* decorative wave */}
          <svg
            viewBox="0 0 400 80"
            className="absolute -bottom-1 left-0 right-0 w-full"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d="M0 40 C100 80 300 0 400 40 L400 80 L0 80 Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </div>

      {/* Social row + CTAs */}
      <div className="w-full max-w-sm flex flex-col items-center gap-6 pb-4">
        <p className="text-xs text-muted-foreground">Sign up with social account</p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Continue with Google"
            disabled
            className="h-10 w-10 rounded-full bg-gradient-to-tr from-[hsl(14_90%_60%)] to-[hsl(45_95%_60%)] shadow-sm opacity-90"
          />
          <button
            type="button"
            aria-label="Continue with Facebook"
            disabled
            className="h-10 w-10 rounded-full bg-gradient-to-tr from-[hsl(220_85%_55%)] to-[hsl(234_89%_64%)] shadow-sm opacity-90"
          />
          <button
            type="button"
            aria-label="Continue with Apple"
            disabled
            className="h-10 w-10 rounded-full bg-gradient-to-tr from-[hsl(0_0%_15%)] to-[hsl(0_0%_35%)] shadow-sm opacity-90"
          />
        </div>

        <Button
          onClick={() => navigate('/auth')}
          className="w-full h-12 text-base font-semibold"
        >
          Sign up
        </Button>

        <button
          onClick={() => navigate('/terms')}
          className="text-[12px] text-primary hover:underline underline-offset-2"
        >
          Read User License Agreement
        </button>
      </div>
    </div>
  );
}
