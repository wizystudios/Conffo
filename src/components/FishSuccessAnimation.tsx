import { useEffect, useState } from 'react';

interface FishSuccessAnimationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

export function FishSuccessAnimation({ 
  show, 
  message = "Success!", 
  onComplete 
}: FishSuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) {
          setTimeout(onComplete, 300);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="relative">
        {/* Background blur effect */}
        <div className="absolute inset-0 bg-background/20 backdrop-blur-sm rounded-full w-32 h-32 animate-scale-in" />
        
        {/* Main fish animation */}
        <div className="relative z-10 animate-bounce">
          <div className="transform transition-all duration-500 animate-scale-in">
            <img 
              src="/lovable-uploads/d4fd9efb-43e0-4330-ab14-b265b0098be2.png" 
              alt="Success" 
              className="w-24 h-24 object-contain animate-pulse"
            />
          </div>
          
          {/* Success particles */}
          <div className="absolute inset-0">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"
                style={{
                  top: `${20 + Math.sin(i) * 30}%`,
                  left: `${20 + Math.cos(i) * 30}%`,
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>
          
          {/* Happy bubbles */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-blue-400/60 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-blue-300/60 rounded-full animate-bounce delay-200"></div>
              <div className="w-1.5 h-1.5 bg-blue-200/60 rounded-full animate-bounce delay-300"></div>
            </div>
          </div>
        </div>

        {/* Success message */}
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <p className="text-sm font-medium text-green-600 dark:text-green-400 animate-fade-in bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}