import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  isRefreshing, 
  progress 
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  const isReady = progress >= 1;

  return (
    <div 
      className="flex justify-center items-center overflow-hidden transition-all duration-200 ease-out"
      style={{ height: Math.max(pullDistance, isRefreshing ? 60 : 0) }}
    >
      <div className="flex flex-col items-center gap-1">
        <div 
          className={`
            p-2.5 rounded-full transition-all duration-300
            ${isRefreshing 
              ? 'bg-primary/20 animate-spin' 
              : isReady 
                ? 'bg-primary/20 scale-110' 
                : 'bg-muted/50'
            }
          `}
          style={{ 
            opacity: Math.max(progress * 1.2, 0.3),
            transform: isRefreshing 
              ? 'rotate(0deg)' 
              : `rotate(${progress * 180}deg) scale(${0.7 + progress * 0.3})`
          }}
        >
          {isRefreshing ? (
            <RefreshCw className="h-5 w-5 text-primary" />
          ) : isReady ? (
            <RefreshCw className="h-5 w-5 text-primary" />
          ) : (
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        
        {!isRefreshing && (
          <span className="text-[10px] text-muted-foreground font-medium transition-opacity duration-200">
            {isReady ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        )}
        
        {isRefreshing && (
          <span className="text-[10px] text-primary font-medium animate-pulse">
            Refreshing...
          </span>
        )}
      </div>
    </div>
  );
}
