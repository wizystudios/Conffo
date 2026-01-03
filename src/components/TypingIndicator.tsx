import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
  userName?: string;
}

export function TypingIndicator({ className, userName }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 py-2 px-3', className)}>
      <div className="flex items-center gap-1 bg-muted/50 rounded-full px-3 py-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
          <span className="h-2 w-2 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
          <span className="h-2 w-2 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
        </div>
      </div>
      {userName && <span className="text-xs text-muted-foreground">{userName} is typing</span>}
    </div>
  );
}
