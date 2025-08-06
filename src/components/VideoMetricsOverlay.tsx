import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, Eye, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from '@/components/FollowButton';
import { UsernameDisplay } from '@/components/UsernameDisplay';

interface VideoMetricsOverlayProps {
  confessionId: string;
  userId: string;
  username?: string;
  avatarUrl?: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[];
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  isLiked: boolean;
}

export function VideoMetricsOverlay({
  confessionId,
  userId,
  username,
  avatarUrl,
  likes,
  comments,
  views,
  tags,
  onLike,
  onComment,
  onShare,
  isLiked
}: VideoMetricsOverlayProps) {
  const [uniqueViews, setUniqueViews] = useState(views);
  
  useEffect(() => {
    // Track unique view
    const trackView = async () => {
      try {
        // Implement view tracking logic here
        setUniqueViews(prev => prev + 1);
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };
    
    trackView();
  }, [confessionId]);

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top overlay - Views */}
      <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/50 rounded-full px-3 py-1 pointer-events-auto">
        <Eye className="h-4 w-4 text-white" />
        <span className="text-white text-sm font-medium">{formatCount(uniqueViews)}</span>
      </div>

      {/* Bottom left - User info and tags */}
      <div className="absolute bottom-20 left-4 right-20 pointer-events-auto">
        <div className="space-y-3">
          {/* User info */}
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <UsernameDisplay
                  userId={userId}
                  showAvatar={false}
                />
                <FollowButton userId={userId} />
              </div>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-white/20 text-white border-none text-xs flex items-center gap-1"
                >
                  <Hash className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="absolute bottom-20 right-4 flex flex-col space-y-4 pointer-events-auto">
        {/* Like */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLike}
            className={`rounded-full h-12 w-12 ${
              isLiked 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">{formatCount(likes)}</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onComment}
            className="rounded-full h-12 w-12 bg-white/20 hover:bg-white/30 text-white"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">{formatCount(comments)}</span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onShare}
            className="rounded-full h-12 w-12 bg-white/20 hover:bg-white/30 text-white"
          >
            <Share className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}