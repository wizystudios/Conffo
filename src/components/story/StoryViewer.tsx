import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { X, Heart, Eye } from 'lucide-react';
import { Story } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { markStoryAsViewed, addStoryReaction, getStoryViewers } from '@/services/storyService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface StoryViewerProps {
  stories: Story[];
  initialStoryIndex?: number;
  onClose: () => void;
  onPrevUser?: () => void;
  onNextUser?: () => void;
  refetch?: () => void;
}

export function StoryViewer({
  stories,
  initialStoryIndex = 0,
  onClose,
  onPrevUser,
  onNextUser,
  refetch
}: StoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [viewers, setViewers] = useState<any[]>([]);
  const [reactionCount, setReactionCount] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Swipe handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  
  const currentStory = stories[currentIndex];
  
  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (onNextUser) {
        onNextUser();
      } else {
        onClose();
      }
    }
  }, [currentIndex, stories.length, onNextUser, onClose]);
  
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      if (onPrevUser) {
        onPrevUser();
      }
    }
  }, [currentIndex, onPrevUser]);
  
  useEffect(() => {
    if (!currentStory || !user) return;
    
    // Mark the story as viewed
    if (user.id) {
      markStoryAsViewed(currentStory.id, user.id);
    }
    
    // Get viewers count
    getStoryViewers(currentStory.id).then(result => {
      setViewerCount(result.count || 0);
      setViewers(result.viewers || []);
    });
    
    // Reset progress
    setProgress(0);
    
    let duration = 5000; // Default for images: 5 seconds
    
    // If video, get its duration
    if (currentStory.mediaType === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      
      if (videoRef.current.readyState >= 1) {
        duration = videoRef.current.duration * 1000;
      }
    }
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Start the progress interval
    if (!isPaused) {
      const startTime = Date.now();
      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress >= 100) {
          clearInterval(progressIntervalRef.current!);
          goToNext();
        }
      }, 100);
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentStory, currentIndex, isPaused, user, goToNext]);
  
  const handlePause = () => {
    setIsPaused(true);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    if (videoRef.current && currentStory.mediaType === 'video') {
      videoRef.current.pause();
    }
  };
  
  const handleResume = () => {
    setIsPaused(false);
    
    if (videoRef.current && currentStory.mediaType === 'video') {
      videoRef.current.play();
    }
  };
  
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      const duration = videoRef.current.duration * 1000;
      
      if (!isPaused) {
        const startTime = Date.now();
        progressIntervalRef.current = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          const newProgress = Math.min((elapsed / duration) * 100, 100);
          setProgress(newProgress);
          
          if (newProgress >= 100) {
            clearInterval(progressIntervalRef.current!);
            goToNext();
          }
        }, 100);
      }
    }
  };
  
  const handleReaction = async (reaction: string) => {
    if (!currentStory || !user) return;
    
    try {
      await addStoryReaction(currentStory.id, user.id, reaction);
      setReactionCount(prev => prev + 1);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    handlePause();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    handleResume();
    
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    
    // Only handle horizontal swipes (ignore vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swipe left - go to next user
        if (onNextUser) onNextUser();
        else onClose();
      } else {
        // Swipe right - go to previous user
        if (onPrevUser) onPrevUser();
      }
    }
    
    // Reset
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  };

  // Tap handlers - left third goes back, right third goes forward
  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width / 3) {
      goToPrevious();
    } else if (x > (width * 2) / 3) {
      goToNext();
    }
    // Middle third does nothing (for pausing)
  };
  
  if (!currentStory) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div 
        className="w-full h-full max-w-md mx-auto relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 px-2 pt-2 safe-area-inset-top">
          <div className="flex gap-1">
            {stories.map((_, index) => (
              <div 
                key={index}
                className="h-0.5 bg-white/30 rounded-full flex-1 overflow-hidden"
              >
                {index === currentIndex && (
                  <div 
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                )}
                {index < currentIndex && (
                  <div className="h-full bg-white rounded-full w-full" />
                )}
              </div>
            ))}
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between mt-3 px-1">
            <UsernameDisplay 
              userId={currentStory.userId} 
              showAvatar={true} 
              size="md"
              showStoryIndicator={false}
            />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white opacity-80 hover:opacity-100 h-8 w-8"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Story content */}
        <div className="h-full w-full">
          {currentStory.mediaType === 'image' ? (
            <img 
              src={currentStory.mediaUrl} 
              alt="Story"
              className="w-full h-full object-contain"
              style={{
                filter: currentStory.effects?.beautyMode 
                  ? 'brightness(1.1) contrast(0.9) saturate(1.1)' 
                  : `
                    brightness(${currentStory.effects?.filters?.brightness || 100}%) 
                    contrast(${currentStory.effects?.filters?.contrast || 100}%) 
                    saturate(${currentStory.effects?.filters?.saturation || 100}%) 
                    blur(${currentStory.effects?.filters?.blur || 0}px)
                  `
              }}
            />
          ) : (
            <video 
              ref={videoRef}
              src={currentStory.mediaUrl} 
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleVideoLoadedMetadata}
              style={{
                filter: currentStory.effects?.beautyMode 
                  ? 'brightness(1.1) contrast(0.9) saturate(1.1)' 
                  : `
                    brightness(${currentStory.effects?.filters?.brightness || 100}%) 
                    contrast(${currentStory.effects?.filters?.contrast || 100}%) 
                    saturate(${currentStory.effects?.filters?.saturation || 100}%) 
                    blur(${currentStory.effects?.filters?.blur || 0}px)
                  `
              }}
            />
          )}
          
          {/* Render text overlays */}
          {currentStory.effects?.text?.map((text) => (
            <div
              key={text.id}
              className="absolute pointer-events-none"
              style={{
                left: `${text.position.x}%`,
                top: `${text.position.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 15
              }}
            >
              <p
                style={{
                  fontSize: `${text.style?.fontSize || 24}px`,
                  fontFamily: text.style?.fontFamily || 'Arial',
                  color: text.style?.color || '#ffffff',
                  fontWeight: text.style?.isBold ? 'bold' : 'normal',
                  fontStyle: text.style?.isItalic ? 'italic' : 'normal',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  margin: 0
                }}
              >
                {text.content}
              </p>
            </div>
          ))}
          
          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-10">
              <p className="text-white text-center text-sm">{currentStory.caption}</p>
            </div>
          )}
        </div>
        
        {/* Reaction bar */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-20">
          <Button 
            variant="ghost" 
            size="icon"
            className="bg-black/30 text-white rounded-full h-10 w-10 hover:bg-black/50"
            onClick={(e) => { e.stopPropagation(); handleReaction('heart'); }}
          >
            <Heart className="h-5 w-5" />
          </Button>
          
          {/* View count */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                className="bg-black/30 text-white rounded-full h-10 px-3 hover:bg-black/50 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="h-4 w-4 mr-1" />
                <span className="text-sm">{viewerCount}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 max-h-60 overflow-y-auto">
              <h4 className="font-medium mb-2 text-sm">Viewers</h4>
              <div className="space-y-2">
                {viewers.length > 0 ? (
                  viewers.map(viewer => (
                    <div key={viewer.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={viewer.avatar_url || ''} />
                        <AvatarFallback className="text-xs">{viewer.username?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{viewer.username || 'Anonymous'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No viewers yet</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
