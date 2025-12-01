import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'audio';
}

interface MediaCarouselProps {
  media: MediaItem[];
  className?: string;
  onOpenGallery?: (index: number) => void;
}

export function MediaCarousel({ media, className = '', onOpenGallery }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!media || media.length === 0) return null;

  if (media.length === 1) {
    const item = media[0];
    return (
      <div 
        className={`relative w-full aspect-square bg-background ${className}`}
        onClick={() => onOpenGallery?.(0)}
      >
        {item.type === 'image' ? (
          <img
            src={item.url}
            alt="Post media"
            className="w-full h-full object-contain cursor-pointer"
            loading="lazy"
          />
        ) : item.type === 'video' ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={item.url}
              controls
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
                if (videoRef.current) videoRef.current.muted = !isMuted;
              }}
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/60 hover:bg-black/80 rounded-full"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
            </Button>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <audio controls src={item.url} className="max-w-full" />
          </div>
        )}
      </div>
    );
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const itemWidth = containerRef.current.offsetWidth;
    containerRef.current.scrollBy({ left: -itemWidth, behavior: 'smooth' });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        onClick={() => onOpenGallery?.(currentIndex)}
        className="w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide flex cursor-pointer"
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
                muted
                className="w-full h-full object-contain"
                onClick={(e) => e.stopPropagation()}
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
