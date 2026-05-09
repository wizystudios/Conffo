import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Conffo welcome / landing screen.
 * Edge-to-edge blue→purple gradient hero with curved bottom edge
 * (no white space after the curve). Three avatar bubbles show real
 * Conffo members and tap through to the sign-up flow (promotes the app).
 */
export function WelcomeScreen() {
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState<Array<{ id: string; url: string | null; username: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, avatar_url, username')
          .not('avatar_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(3);
        if (!cancelled && data && data.length) {
          setAvatars(data.map((p: any) => ({ id: p.id, url: p.avatar_url, username: p.username || 'user' })));
        }
      } catch {
        /* fall back to gradient placeholders */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Gradient placeholders if no real avatars are available yet.
  const placeholders = [
    'from-[hsl(234_89%_64%)] to-[hsl(270_95%_70%)]',
    'from-[hsl(280_90%_65%)] to-[hsl(330_85%_65%)]',
    'from-[hsl(200_90%_60%)] to-[hsl(234_89%_64%)]',
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Full-bleed hero with curved bottom — single curve as the only divider */}
      <div className="relative w-full bg-gradient-primary text-primary-foreground pt-16 pb-24 px-6">
        <h1 className="text-4xl font-bold tracking-tight text-center">Conffo</h1>

        <div className="mt-12 flex items-center justify-center">
          <div className="h-24 w-24 rounded-2xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
            <MessageSquare className="h-12 w-12" strokeWidth={2.2} />
          </div>
        </div>

        {/* Curve — no shadow, no extra divider line */}
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
          <p className="text-sm text-muted-foreground">Join thousands sharing on Conffo</p>

          <div className="flex items-center gap-5">
            {[0, 1, 2].map((i) => {
              const a = avatars[i];
              if (a?.url) {
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => navigate('/auth')}
                    aria-label={`Join Conffo like ${a.username}`}
                    className="h-14 w-14 rounded-full overflow-hidden ring-2 ring-background shadow-primary active:scale-95 transition-transform bg-muted"
                  >
                    <img src={a.url} alt={a.username} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => navigate('/auth')}
                  aria-label="Sign up for Conffo"
                  className={`h-14 w-14 rounded-full bg-gradient-to-tr ${placeholders[i]} ring-2 ring-background shadow-primary active:scale-95 transition-transform`}
                />
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground text-center max-w-[240px]">
            Tap an avatar to create your own Conffo account
          </p>
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
