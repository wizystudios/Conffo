import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Star, Users } from 'lucide-react';
import { Confession } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { haptic } from '@/utils/hapticFeedback';
import { MediaCarouselDisplay } from '@/components/MediaCarouselDisplay';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImprovedCommentModal } from '@/components/ImprovedCommentModal';
import { InlineAudioRecorder } from '@/components/InlineAudioRecorder';
import { toast } from '@/hooks/use-toast';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);

  // Fetch user profile if confession has userId
  const { data: authorProfile } = useQuery({
    queryKey: ['profile', confession.userId],
    queryFn: async () => {
      if (!confession.userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', confession.userId)
        .maybeSingle();
      return data;
    },
    enabled: !!confession.userId,
  });

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

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }
    
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
    
    queryClient.invalidateQueries({ queryKey: ['reactions', confession.id] });
    onUpdate?.();
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowComments(true);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confession.userId) {
      navigate(`/user/${confession.userId}`);
    }
  };

  const handleAudioCommentPosted = () => {
    queryClient.invalidateQueries({ queryKey: ['comment-count', confession.id] });
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

  // Determine display name and avatar
  const displayName = authorProfile?.username || 'Anonymous';
  const avatarUrl = authorProfile?.avatar_url || null;
  const isAnonymous = !authorProfile?.username;

  return (
    <>
      <div 
        className="conffo-glass-card p-4 mx-3 mb-3 conffo-stagger-item"
        style={{ 
          animationDelay: `${index * 80}ms`,
        }}
      >
        {/* Header - Clickable profile */}
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={handleProfileClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            disabled={!confession.userId}
          >
            {isAnonymous ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            ) : (
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="text-sm bg-gradient-to-br from-primary/30 to-primary/10">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="font-medium text-sm">{displayName}</span>
            {confession.tags?.includes('featured') && (
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            )}
          </button>
          <span className="text-xs text-muted-foreground">{timeAgo} ago</span>
        </div>

        {/* Content - No link to post page, content is read inline */}
        <p className="text-sm leading-relaxed mb-3 line-clamp-4">
          {confession.content}
        </p>

        {/* Media Display - Show if media exists, no link to separate page */}
        {hasMedia && mediaUrls.length > 0 && (
          <div className="block mb-3">
            <div className="rounded-xl overflow-hidden">
              <MediaCarouselDisplay
                media={mediaUrls.map((url, i) => ({
                  url,
                  type: mediaTypes[i] || 'image'
                }))}
              />
            </div>
          </div>
        )}

        {/* Footer with inline actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Comment button - opens comment modal directly */}
            <button 
              onClick={handleComment}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <MessageCircle className="h-4 w-4 text-primary/70" />
              <span className="text-xs text-muted-foreground">{commentCount}</span>
            </button>

            {/* Inline Audio Recorder - Record audio comment without opening modal */}
            {user && (
              <InlineAudioRecorder
                confessionId={confession.id}
                userId={user.id}
                onCommentPosted={handleAudioCommentPosted}
              />
            )}
          </div>

          {/* Like button - works inline */}
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

      {/* Comment Modal */}
      <ImprovedCommentModal
        confessionId={confession.id}
        confessionContent={confession.content}
        confessionAuthor={displayName}
        confessionMediaUrl={confession.mediaUrl || undefined}
        confessionMediaType={confession.mediaType === 'audio' ? undefined : confession.mediaType}
        confessionMediaUrls={confession.mediaUrls}
        confessionMediaTypes={confession.mediaTypes?.filter(t => t !== 'audio') as ('image' | 'video')[] | undefined}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
    </>
  );
});
