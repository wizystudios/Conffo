
import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Story } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { markStoryAsViewed } from '@/services/storyService';

interface StoryViewerProps {
  stories: Story[];
  initialStoryIndex?: number;
  onClose: () => void;
  onPrevUser?: () => void;
  onNextUser?: () => void;
}

export function StoryViewer({
  stories,
  initialStoryIndex = 0,
  onClose,
  onPrevUser,
  onNextUser
}: StoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const currentStory = stories[currentIndex];
  
  useEffect(() => {
    if (!currentStory || !user) return;
    
    // Mark the story as viewed
    markStoryAsViewed(currentStory.id, user.id);
    
    // Reset progress
    setProgress(0);
    
    let duration = 5000; // Default for images: 5 seconds
    
    // If video, get its duration
    if (currentStory.mediaType === 'video' && videoRef.current) {
      // This will be updated in the loadedmetadata event
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
  }, [currentStory, currentIndex, isPaused, user]);
  
  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (onNextUser) {
        onNextUser();
      } else {
        onClose();
      }
    }
  };
  
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      if (onPrevUser) {
        onPrevUser();
      }
    }
  };
  
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
      // Reset interval with new video duration
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      const duration = videoRef.current.duration * 1000;
      
      // Start new progress interval
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
  
  if (!currentStory) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <Card className="w-full max-w-sm mx-auto h-[80vh] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 z-10 px-2 py-3">
          {/* Progress bars */}
          <div className="flex gap-1">
            {stories.map((_, index) => (
              <div 
                key={index}
                className="h-1 bg-white/30 rounded-full flex-1 overflow-hidden"
              >
                {index === currentIndex && (
                  <div 
                    className="h-full bg-white rounded-full"
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
          <div className="flex items-center justify-between mt-3">
            <UsernameDisplay 
              userId={currentStory.userId} 
              showAvatar={true} 
              size="md"
              showStoryIndicator={false}
            />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white opacity-80 hover:opacity-100"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Story content */}
        <div className="h-full relative" onTouchStart={handlePause} onTouchEnd={handleResume}>
          {currentStory.mediaType === 'image' ? (
            <img 
              src={currentStory.mediaUrl} 
              alt="Story"
              className="w-full h-full object-cover"
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
              className="w-full h-full object-cover"
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
              className="absolute"
              style={{
                left: `${text.position.x}%`,
                top: `${text.position.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 5
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
          
          {/* Render stickers */}
          {currentStory.effects?.stickers?.map((sticker) => (
            <div
              key={sticker.id}
              className="absolute"
              style={{
                left: `${sticker.position.x}%`,
                top: `${sticker.position.y}%`,
                transform: `translate(-50%, -50%) scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
                zIndex: 5
              }}
            >
              {sticker.type === 'heart' && (
                <div className="text-4xl">❤️</div>
              )}
              {sticker.type === 'star' && (
                <div className="text-4xl">⭐</div>
              )}
              {sticker.type === 'fire' && (
                <div className="text-4xl">🔥</div>
              )}
            </div>
          ))}
          
          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-white text-center">{currentStory.caption}</p>
            </div>
          )}
          
          {/* Navigation controls */}
          <button 
            className="absolute top-0 left-0 w-1/3 h-full z-10 cursor-pointer"
            onClick={goToPrevious}
          />
          <button 
            className="absolute top-0 right-0 w-1/3 h-full z-10 cursor-pointer"
            onClick={goToNext}
          />
          <button
            className="absolute top-0 left-1/3 w-1/3 h-full z-10 cursor-pointer"
            onMouseDown={handlePause}
            onMouseUp={handleResume}
            onTouchStart={handlePause}
            onTouchEnd={handleResume}
          />
        </div>
      </Card>
      
      {/* Prev/Next User buttons (if provided) */}
      <div className="absolute top-1/2 left-0 right-0 flex justify-between px-4">
        {onPrevUser && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white bg-black/30 rounded-full h-10 w-10"
            onClick={onPrevUser}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        
        {onNextUser && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white bg-black/30 rounded-full h-10 w-10"
            onClick={onNextUser}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
