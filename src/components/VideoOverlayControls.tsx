import { Heart, MessageCircle, Share2, Bookmark, Play } from 'lucide-react';

interface VideoOverlayControlsProps {
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  commentsCount: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  isPaused?: boolean;
  onTogglePlay?: () => void;
  isFullscreen?: boolean; // Only show Reels-style on fullscreen/large videos
}

export function VideoOverlayControls({
  isLiked,
  isSaved,
  likesCount,
  commentsCount,
  onLike,
  onComment,
  onShare,
  onSave,
  isPaused,
  onTogglePlay,
  isFullscreen = false
}: VideoOverlayControlsProps) {
  // Only show Reels-style overlay for fullscreen videos
  if (!isFullscreen) {
    return (
      <>
        {/* Center play indicator when paused - minimal for non-fullscreen */}
        {isPaused && onTogglePlay && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer"
            onClick={onTogglePlay}
          >
            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
              <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}
      </>
    );
  }
  
  // Fullscreen Reels-style overlay
  return (
    <>
      {/* Center play indicator when paused */}
      {isPaused && onTogglePlay && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
          onClick={onTogglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" fill="white" />
          </div>
        </div>
      )}
      
      {/* Right side floating controls - Reels style */}
      <div className="absolute right-3 bottom-16 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isLiked ? 'bg-red-500/20' : 'bg-black/30'} backdrop-blur-sm`}>
            <Heart 
              className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'} transition-all`} 
            />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-lg">
            {likesCount > 0 ? likesCount : ''}
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={(e) => { e.stopPropagation(); onComment(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-lg">
            {commentsCount > 0 ? commentsCount : ''}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-6 w-6 text-white" />
          </div>
        </button>

        {/* Save */}
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isSaved ? 'bg-primary/20' : 'bg-black/30'} backdrop-blur-sm`}>
            <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-white' : ''} text-white`} />
          </div>
        </button>
      </div>
    </>
  );
}
