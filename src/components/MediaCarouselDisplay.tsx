import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'audio';
}

interface MediaCarouselDisplayProps {
  media: MediaItem[];
}

export function MediaCarouselDisplay({ media }: MediaCarouselDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!media || media.length === 0) return null;

  // Reset loaded state when index changes
  useEffect(() => {
    setIsImageLoaded(false);
    setIsVideoLoaded(false);
  }, [currentIndex]);

  // Auto-play/pause video based on scroll visibility
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [currentIndex, media]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const currentMedia = media[currentIndex];

  return (
    <div ref={containerRef} className="relative w-full bg-muted/20">
      {/* Fixed aspect ratio container to prevent layout shifts */}
      <div className="relative aspect-square">
        {currentMedia.type === 'image' ? (
          <>
            {/* Skeleton placeholder while loading */}
            {!isImageLoaded && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            <img
              src={currentMedia.url}
              alt=""
              className={`w-full h-full object-contain transition-opacity duration-200 ${
                isImageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setIsImageLoaded(true)}
            />
          </>
        ) : currentMedia.type === 'video' ? (
          <div className="relative w-full h-full">
            {/* Skeleton placeholder while loading */}
            {!isVideoLoaded && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            <video
              ref={videoRef}
              src={currentMedia.url}
              className={`w-full h-full object-contain transition-opacity duration-200 ${
                isVideoLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
              onClick={togglePlay}
              onLoadedData={() => setIsVideoLoaded(true)}
              onCanPlay={() => setIsVideoLoaded(true)}
            />
            {/* Video Controls - only show when loaded */}
            {isVideoLoaded && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <audio src={currentMedia.url} controls className="w-full max-w-xs" />
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {media.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Indicator Dots */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-white w-4' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}

      {/* Counter Badge */}
      {media.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium">
          {currentIndex + 1}/{media.length}
        </div>
      )}
    </div>
  );
}
