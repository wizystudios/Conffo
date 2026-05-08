import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface FishSuccessAnimationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

/**
 * Minimal green-tick success splash.
 * Shows for ~1.6s then fades out and calls onComplete.
 * Used for login, logout, post creation, etc. (replaces toasts).
 */
export function FishSuccessAnimation({
  show,
  message,
  onComplete,
}: FishSuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!show) return;
    setIsVisible(true);
    setIsFading(false);

    const fadeTimer = setTimeout(() => setIsFading(true), 1300);
    const doneTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 1700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center pointer-events-none bg-background/40 backdrop-blur-sm transition-opacity duration-300 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 animate-in zoom-in-50 fade-in duration-300">
        <div className="h-20 w-20 rounded-full flex items-center justify-center shadow-primary bg-gradient-primary">
          <Check
            className="h-11 w-11 text-primary-foreground"
            strokeWidth={3.5}
          />
        </div>
        {message && (
          <p className="text-sm font-semibold text-foreground/80">{message}</p>
        )}
      </div>
    </div>
  );
}
