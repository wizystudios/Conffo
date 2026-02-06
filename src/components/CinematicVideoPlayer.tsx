import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { haptic } from '@/utils/hapticFeedback';

interface CinematicVideoPlayerProps {
  src: string;
  confessionId?: string;
  onDeepDive?: () => void;
}

export function CinematicVideoPlayer({ 
  src, 
  confessionId,
  onDeepDive 
}: CinematicVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout>();
  const doubleTapRef = useRef<number>(0);
  const originalPlaybackRate = useRef(1);

  // Auto-play when visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
            setIsPlaying(true);
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Progress update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  // Hold to slow down
  const handleHoldStart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    haptic.light();
    setIsHolding(true);
    originalPlaybackRate.current = video.playbackRate;
    video.playbackRate = 0.5; // Slow down
  }, []);

  const handleHoldEnd = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isHolding) return;
    
    setIsHolding(false);
    video.playbackRate = originalPlaybackRate.current;
  }, [isHolding]);

  // Double tap for deep dive
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - doubleTapRef.current < 300) {
      // Double tap detected
      haptic.medium();
      setShowDeepDive(true);
      onDeepDive?.();
      
      // Hide after 3 seconds
      setTimeout(() => setShowDeepDive(false), 3000);
    }
    doubleTapRef.current = now;
  }, [onDeepDive]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    setIsMuted(!isMuted);
    haptic.light();
  };

  return (
    <div 
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Letterbox container - cinematic 16:9 ratio */}
      <div className="relative aspect-video bg-black">
        {/* Video */}
        <video
          ref={videoRef}
          src={src}
          className="absolute inset-0 w-full h-full object-contain"
          loop
          muted={isMuted}
          playsInline
          onClick={handleTap}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
        />

        {/* Blurred sides for vertical videos */}
        <div className="absolute inset-0 -z-10 scale-110 blur-2xl opacity-30">
          <video
            src={src}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        </div>
      </div>

      {/* Hold indicator */}
      {isHolding && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="text-white text-sm font-medium px-4 py-2 bg-black/50 rounded-full">
            0.5x Slow
          </div>
        </div>
      )}

      {/* Deep dive overlay - appears on double tap */}
      {showDeepDive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="text-center text-white px-6">
            <p className="text-lg font-semibold mb-2">Going deeper...</p>
            <p className="text-sm opacity-80">Explore related confessions</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Center play button */}
        {!isPlaying && (
          <button 
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="h-6 w-6 text-white ml-1" fill="white" />
            </div>
          </button>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Progress bar */}
          <div className="h-1 bg-white/30 rounded-full mb-3 overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white">
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" fill="white" />
                )}
              </button>
              
              <button onClick={toggleMute} className="text-white">
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-white/70 text-xs">
              <span>Hold to slow • Double-tap to explore</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
