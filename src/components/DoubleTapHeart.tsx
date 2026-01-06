import { useState, useRef, ReactNode } from 'react';
import { Heart } from 'lucide-react';
import { haptic } from '@/utils/hapticFeedback';

interface DoubleTapHeartProps {
  children: ReactNode;
  onDoubleTap?: () => void;
  isLiked?: boolean;
}

export function DoubleTapHeart({ children, onDoubleTap, isLiked }: DoubleTapHeartProps) {
  const [showHeart, setShowHeart] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track if this was a navigation tap (on arrows/dots)
  const isNavigationTap = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Check if the click is on navigation buttons, video controls, or indicator dots
    return target.closest('button') !== null || 
           target.closest('[role="button"]') !== null ||
           target.tagName === 'BUTTON';
  };

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't trigger double-tap on navigation elements
    if (isNavigationTap(e)) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD) {
      // Double tap detected - prevent default to avoid navigation
      e.preventDefault();
      e.stopPropagation();
      
      haptic.heavy();
      
      // Get position for heart animation
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.changedTouches?.[0]?.clientX || 0;
        clientY = e.changedTouches?.[0]?.clientY || 0;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setHeartPosition({
          x: clientX - rect.left,
          y: clientY - rect.top
        });
      }

      // Show heart animation
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);

      // Call the like handler if not already liked
      if (!isLiked && onDoubleTap) {
        onDoubleTap();
      }
      
      // Reset to prevent triple-tap issues
      lastTapRef.current = 0;
      return;
    }
    
    lastTapRef.current = now;
  };

  return (
    <div 
      ref={containerRef}
      className="relative"
      onDoubleClick={handleTap}
    >
      {children}
      
      {/* Heart Animation Overlay */}
      {showHeart && (
        <div 
          className="absolute pointer-events-none z-50"
          style={{
            left: heartPosition.x,
            top: heartPosition.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <Heart 
            className="h-20 w-20 fill-red-500 text-red-500 animate-heart-burst"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))'
            }}
          />
        </div>
      )}
    </div>
  );
}
