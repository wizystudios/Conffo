import { RefreshCw } from 'lucide-react';

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

  return (
    <div 
      className="flex justify-center items-center overflow-hidden transition-all duration-200"
      style={{ height: pullDistance }}
    >
      <div 
        className={`p-2 rounded-full bg-primary/10 ${isRefreshing ? 'animate-spin' : ''}`}
        style={{ 
          opacity: progress,
          transform: `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`
        }}
      >
        <RefreshCw className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
}
