import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Star, Users } from 'lucide-react';
import { Confession } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { haptic } from '@/utils/hapticFeedback';
import { MediaCarouselDisplay } from '@/components/MediaCarouselDisplay';

interface ConffoConfessionCardProps {
  confession: Confession;
  onUpdate?: () => void;
  index?: number;
}

export const ConffoConfessionCard = memo(function ConffoConfessionCard({ 
  confession, 
  onUpdate,
  index = 0 
}: ConffoConfessionCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);

  // Fetch reaction count
  const { data: reactionData } = useQuery({
    queryKey: ['reactions', confession.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reactions')
        .select('id, type, user_id')
        .eq('confession_id', confession.id);
      
      if (error) throw error;
      
      const heartCount = data?.filter(r => r.type === 'heart').length || 0;
      const userHasLiked = data?.some(r => r.user_id === user?.id && r.type === 'heart') || false;
      
      return { heartCount, userHasLiked };
    },
  });

  // Fetch comment count
  const { data: commentCount = 0 } = useQuery({
    queryKey: ['comment-count', confession.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('confession_id', confession.id);
      return count || 0;
    },
  });

  const handleLike = async () => {
    if (!user) return;
    haptic.light();
    
    const hasLiked = reactionData?.userHasLiked;
    
    if (hasLiked) {
      await supabase
        .from('reactions')
        .delete()
        .eq('confession_id', confession.id)
        .eq('user_id', user.id)
        .eq('type', 'heart');
    } else {
      await supabase
        .from('reactions')
        .insert({
          confession_id: confession.id,
          user_id: user.id,
          type: 'heart'
        });
    }
    
    onUpdate?.();
  };

  const timeAgo = formatDistanceToNow(new Date(confession.timestamp), { addSuffix: false })
    .replace('about ', '')
    .replace('less than a minute', '1m')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' days', 'd')
    .replace(' day', 'd');

  // Get room tag display
  const getRoomTag = () => {
    const room = confession.room?.toLowerCase() || '';
    if (room.includes('heart') || room.includes('relationship')) return '#Heartbreak';
    if (room.includes('school') || room.includes('student')) return '#School';
    if (room.includes('work') || room.includes('job')) return '#Work';
    if (room.includes('family')) return '#Family';
    if (room.includes('friend')) return '#Friends';
    return `#${confession.room || 'Random'}`;
  };

  // Check for media
  const hasMedia = confession.mediaUrls?.length || confession.mediaUrl;
  const mediaUrls = confession.mediaUrls || (confession.mediaUrl ? [confession.mediaUrl] : []);
  const mediaTypes = confession.mediaTypes || (confession.mediaType ? [confession.mediaType] : []);

  return (
    <div 
      className="conffo-glass-card p-4 mx-3 mb-3 conffo-stagger-item"
      style={{ 
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm">Anonymous</span>
          {confession.tags?.includes('featured') && (
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">{timeAgo} ago</span>
      </div>

      {/* Content */}
      <Link to={`/confession/${confession.id}`}>
        <p className="text-sm leading-relaxed mb-3 line-clamp-4">
          {confession.content}
        </p>
      </Link>

      {/* Media Display - Show if media exists */}
      {hasMedia && mediaUrls.length > 0 && (
        <Link to={`/confession/${confession.id}`} className="block mb-3">
          <div className="rounded-xl overflow-hidden">
            <MediaCarouselDisplay
              mediaUrls={mediaUrls}
              mediaTypes={mediaTypes}
            />
          </div>
        </Link>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Reactions indicator */}
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              <span className="text-sm">💔</span>
              <span className="text-sm">😢</span>
            </div>
            <span className="text-xs text-muted-foreground">{commentCount} replies</span>
          </div>
          
          <button className="flex items-center gap-1" onClick={handleLike}>
            <MessageCircle className="h-4 w-4 text-primary/70" />
            <span className="text-xs text-muted-foreground">{reactionData?.heartCount || 0}</span>
          </button>
        </div>

        <button 
          onClick={handleLike}
          className="flex items-center gap-1.5 transition-transform active:scale-95"
        >
          <Heart 
            className={`h-5 w-5 transition-colors ${
              reactionData?.userHasLiked 
                ? 'text-pink-500 fill-pink-500' 
                : 'text-pink-400'
            }`} 
          />
          <span className="text-sm font-medium text-pink-400">
            {reactionData?.heartCount || 0}
          </span>
        </button>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
        <span className="text-xs text-primary/80 font-medium">{getRoomTag()}</span>
        {confession.tags?.slice(0, 2).map((tag, i) => (
          <span key={i} className="text-xs text-muted-foreground">#{tag}</span>
        ))}
      </div>
    </div>
  );
});
