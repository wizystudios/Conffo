import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

/**
 * Conffo welcome / landing screen.
 * Edge-to-edge blue→purple gradient hero with curved bottom edge
 * (no white space after the curve). Three avatar bubbles each open
 * the User License Agreement.
 */
export function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Full-bleed hero with curved bottom */}
      <div className="relative w-full bg-gradient-primary text-primary-foreground pt-16 pb-24 px-6 shadow-primary">
        <h1 className="text-4xl font-bold tracking-tight text-center">Conffo</h1>

        <div className="mt-12 flex items-center justify-center">
          <div className="h-24 w-24 rounded-2xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
            <MessageSquare className="h-12 w-12" strokeWidth={2.2} />
          </div>
        </div>

        {/* Curve forms the very bottom edge of the hero — no whitespace below */}
        <svg
          viewBox="0 0 400 60"
          className="absolute -bottom-px left-0 right-0 w-full block"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 30 C120 70 280 -10 400 30 L400 60 L0 60 Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* CTAs */}
      <div className="flex-1 w-full max-w-sm mx-auto flex flex-col items-center justify-between gap-8 px-6 pt-10 pb-10">
        <div className="flex flex-col items-center gap-6 w-full">
          <p className="text-sm text-muted-foreground">Share Your Confession</p>

          <div className="flex items-center gap-5">
            {[
              'from-[hsl(234_89%_64%)] to-[hsl(270_95%_70%)]',
              'from-[hsl(280_90%_65%)] to-[hsl(330_85%_65%)]',
              'from-[hsl(200_90%_60%)] to-[hsl(234_89%_64%)]',
            ].map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => navigate('/terms')}
                aria-label="Read User License Agreement"
                className={`h-12 w-12 rounded-full bg-gradient-to-tr ${g} shadow-primary ring-2 ring-background active:scale-95 transition-transform`}
              />
            ))}
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-4">
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
    </div>
  );
}
