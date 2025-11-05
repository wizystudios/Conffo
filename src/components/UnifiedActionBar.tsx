import { MessageCircle, UserPlus, Share2, Flag, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

interface UnifiedActionBarProps {
  type: 'post' | 'profile';
  onComment?: () => void;
  onLike?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  onReport?: () => void;
  isLiked?: boolean;
  isFollowing?: boolean;
  likesCount?: number;
  commentsCount?: number;
}

export function UnifiedActionBar({
  type,
  onComment,
  onLike,
  onShare,
  onFollow,
  onMessage,
  onReport,
  isLiked = false,
  isFollowing = false,
  likesCount = 0,
  commentsCount = 0,
}: UnifiedActionBarProps) {
  const { isAuthenticated } = useAuth();
  const [animateLike, setAnimateLike] = useState(false);

  const handleLike = () => {
    if (onLike) {
      setAnimateLike(true);
      setTimeout(() => setAnimateLike(false), 300);
      onLike();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-30 py-2 px-4">
      <div className="max-w-lg mx-auto flex items-center justify-around gap-2">
        {type === 'post' ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`flex-1 gap-2 smooth-transition ${isLiked ? 'text-red-500' : ''} ${animateLike ? 'heart-pop' : ''}`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{likesCount > 0 ? likesCount : 'Like'}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onComment}
              className="flex-1 gap-2 smooth-transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{commentsCount > 0 ? commentsCount : 'Comment'}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="flex-1 gap-2 smooth-transition"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-xs">Share</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={onFollow}
              className="flex-1 gap-2 smooth-transition"
            >
              <UserPlus className="h-4 w-4" />
              <span className="text-xs">{isFollowing ? 'Remove from Crew' : 'Add to Crew'}</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onMessage}
              className="flex-1 gap-2 smooth-transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">Message</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onReport}
              className="gap-2 smooth-transition text-destructive"
            >
              <Flag className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
