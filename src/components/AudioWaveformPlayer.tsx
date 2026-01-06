import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioWaveformPlayerProps {
  audioUrl: string;
  duration: number;
  waveform?: number[];
}

export function AudioWaveformPlayer({ audioUrl, duration, waveform }: AudioWaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Generate default waveform if none provided
  const displayWaveform = waveform && waveform.length > 0 
    ? waveform 
    : Array.from({ length: 30 }, () => Math.random() * 0.6 + 0.2);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentProgress = (audio.currentTime / audio.duration) * 100;
      setProgress(currentProgress);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    audio.currentTime = clickPosition * audio.duration;
    setProgress(clickPosition * 100);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-primary/10 rounded-full px-2 py-1 min-w-0">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        className="h-6 w-6 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 ml-0.5" />
        )}
      </Button>

      <div 
        className="flex items-end gap-[1px] h-5 flex-1 cursor-pointer min-w-0"
        onClick={handleWaveformClick}
      >
        {displayWaveform.map((height, index) => {
          const barProgress = (index / displayWaveform.length) * 100;
          const isActive = barProgress <= progress;
          
          return (
            <div
              key={index}
              className={`w-[2px] rounded-full transition-colors ${
                isActive ? 'bg-primary' : 'bg-primary/30'
              }`}
              style={{ height: `${height * 100}%` }}
            />
          );
        })}
      </div>

      <span className="text-[10px] text-muted-foreground flex-shrink-0">
        {formatDuration(duration)}
      </span>
    </div>
  );
}
