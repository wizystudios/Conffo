import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  containerRef?: React.RefObject<HTMLElement>;
}

export function usePullToRefresh({ 
  onRefresh, 
  threshold = 80,
  containerRef 
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef?.current || document.documentElement;
    const scrollTop = container === document.documentElement 
      ? window.scrollY 
      : container.scrollTop;
    
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [containerRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const container = containerRef?.current || document.documentElement;
    const scrollTop = container === document.documentElement 
      ? window.scrollY 
      : container.scrollTop;

    if (scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY.current) * 0.5);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [isRefreshing, threshold, containerRef]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    
    isPulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef?.current || document;
    
    container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart as EventListener);
      container.removeEventListener('touchmove', handleTouchMove as EventListener);
      container.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, containerRef]);

  return {
    isRefreshing,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1)
  };
}
