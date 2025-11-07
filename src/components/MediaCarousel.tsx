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

  const handlePrev = () => {
    if (!containerRef.current) return;
    const itemWidth = containerRef.current.offsetWidth;
    containerRef.current.scrollBy({ left: -itemWidth, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (!containerRef.current) return;
    const itemWidth = containerRef.current.offsetWidth;
    containerRef.current.scrollBy({ left: itemWidth, behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollLeft = containerRef.current.scrollLeft;
    const itemWidth = containerRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / itemWidth);
    setCurrentIndex(newIndex);
  };

  return (
    <div className={`relative w-full aspect-square ${className}`}>
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

      {/* Navigation Arrows */}
      {media.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all z-10"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
          )}
          {currentIndex < media.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all z-10"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          )}
        </>
      )}

      {/* Page indicators */}
      {media.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none z-10">
          {media.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-2' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Count indicator */}
      {media.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-xs font-medium z-10">
          {currentIndex + 1}/{media.length}
        </div>
      )}
    </div>
  );
}
