import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'audio';
}

interface MediaCarouselProps {
  media: MediaItem[];
  className?: string;
}

export function MediaCarousel({ media, className = '' }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!media || media.length === 0) return null;

  if (media.length === 1) {
    const item = media[0];
    return (
      <div className={`relative w-full aspect-square bg-background ${className}`}>
        {item.type === 'image' ? (
          <img
            src={item.url}
            alt="Post media"
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <video
            src={item.url}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        )}
      </div>
    );
  }

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollLeft = containerRef.current.scrollLeft;
    const itemWidth = containerRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / itemWidth);
    setCurrentIndex(newIndex);
  };

  return (
    <div className={`relative w-full aspect-square bg-background ${className}`}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide flex"
        style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {media.map((item, index) => (
          <div
            key={index}
            className="w-full h-full flex-shrink-0 snap-center snap-always flex items-center justify-center"
          >
            {item.type === 'image' ? (
              <img
                src={item.url}
                alt={`Media ${index + 1}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : item.type === 'video' ? (
              <video
                src={item.url}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            ) : item.type === 'audio' ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 p-6">
                <audio controls className="w-full max-w-md" src={item.url}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Page indicators */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
          {media.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-2'
                  : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Optional: Count indicator */}
      {media.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium">
          {currentIndex + 1}/{media.length}
        </div>
      )}
    </div>
  );
}
