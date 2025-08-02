import { useEffect, useState } from 'react';

interface ConffoLoaderProps {
  onComplete?: () => void;
  duration?: number;
}

export function ConffoLoader({ onComplete, duration = 3000 }: ConffoLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (onComplete) {
            setTimeout(onComplete, 200);
          }
          return 100;
        }
        return prev + 2;
      });
    }, duration / 50);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
      <div className="relative">
        {/* Animated Logo */}
        <div className="relative mb-8 animate-bounce">
          <img 
            src="/lovable-uploads/911a3176-bd7a-4c2f-8145-9fb902754993.png" 
            alt="Conffo" 
            className="w-32 h-32 object-contain animate-pulse filter brightness-0 dark:brightness-100 dark:invert"
          />
          {/* Floating bubbles animation */}
          <div className="absolute -top-4 -right-2">
            <div className="w-3 h-3 bg-primary/30 rounded-full animate-ping"></div>
          </div>
          <div className="absolute -top-2 right-4 animate-ping delay-75">
            <div className="w-2 h-2 bg-primary/40 rounded-full"></div>
          </div>
          <div className="absolute top-2 -right-4 animate-ping delay-150">
            <div className="w-1.5 h-1.5 bg-primary/20 rounded-full"></div>
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-fade-in">
          Conffo
        </h1>

        {/* Progress Bar */}
        <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading Text */}
        <p className="text-center mt-4 text-muted-foreground animate-pulse">
          Loading your confessions...
        </p>
      </div>
    </div>
  );
}