import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, Bookmark, ChevronUp, ChevronDown } from 'lucide-react';
import { Confession } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { haptic } from '@/utils/hapticFeedback';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MediaCarouselDisplay } from '@/components/MediaCarouselDisplay';
import { UnifiedCommentModal } from '@/components/UnifiedCommentModal';

interface ImmersivePostViewerProps {
  confessions: Confession[];
  startIndex?: number;
  onClose: () => void;
  onUpdate?: () => void;
  userName?: string;
  userAvatar?: string;
}

export function ImmersivePostViewer({ 
  confessions, 
  startIndex = 0, 
  onClose, 
  onUpdate,
  userName,
  userAvatar 
}: ImmersivePostViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const currentConfession = confessions[currentIndex];

  // Lock body scroll
  useEffect(() => {
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, []);

  // Reactions
  const { data: reactionData, refetch: refetchReactions } = useQuery({
    queryKey: ['immersive-reactions', currentConfession?.id],
    queryFn: async () => {
      if (!currentConfession) return { heartCount: 0, userHasLiked: false };
      const { data } = await supabase
        .from('reactions')
        .select('id, type, user_id')
        .eq('confession_id', currentConfession.id);
      return {
        heartCount: data?.filter(r => r.type === 'heart').length || 0,
        userHasLiked: data?.some(r => r.user_id === user?.id && r.type === 'heart') || false,
      };
    },
    enabled: !!currentConfession,
  });

  const { data: commentCount = 0 } = useQuery({
    queryKey: ['immersive-comments', currentConfession?.id],
    queryFn: async () => {
      if (!currentConfession) return 0;
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('confession_id', currentConfession.id);
      return count || 0;
    },
    enabled: !!currentConfession,
  });

  const handleLike = async () => {
    if (!user || !currentConfession) return;
    haptic.medium();
    if (reactionData?.userHasLiked) {
      await supabase.from('reactions').delete()
        .eq('confession_id', currentConfession.id)
        .eq('user_id', user.id).eq('type', 'heart');
    } else {
      await supabase.from('reactions').insert({
        confession_id: currentConfession.id,
        user_id: user.id,
        type: 'heart'
      });
    }
    refetchReactions();
    onUpdate?.();
  };

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= confessions.length || isAnimating) return;
    setIsAnimating(true);
    haptic.light();
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 300);
  }, [confessions.length, isAnimating]);

  // Touch handlers for vertical swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchDeltaY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY;
    setTouchDeltaY(delta);
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaY) > 80) {
      if (touchDeltaY < 0) goTo(currentIndex + 1); // swipe up = next
      else goTo(currentIndex - 1); // swipe down = prev
    }
    setTouchDeltaY(0);
    setTouchStartY(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ') goTo(currentIndex + 1);
      if (e.key === 'ArrowUp') goTo(currentIndex - 1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, goTo, onClose]);

  if (!currentConfession) return null;

  const timeAgo = formatDistanceToNow(new Date(currentConfession.timestamp), { addSuffix: true });
  const authorName = userName || 'Anonymous';
  const authorAvatarUrl = userAvatar;
  const hasMedia = currentConfession.mediaUrl || (currentConfession.mediaUrls && currentConfession.mediaUrls.length > 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Progress dots */}
      <div className="absolute top-4 left-4 right-14 z-50 flex gap-1">
        {confessions.map((_, i) => (
          <div 
            key={i}
            className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
              i === currentIndex ? 'bg-white' : i < currentIndex ? 'bg-white/50' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Main content area */}
      <div
        ref={containerRef}
        className="h-full w-full flex flex-col justify-center items-center relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${touchDeltaY * 0.3}px)`,
          transition: touchDeltaY === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {/* Background media or gradient */}
        {hasMedia ? (
          <div className="absolute inset-0">
            {currentConfession.mediaType === 'video' ? (
              <video 
                src={currentConfession.mediaUrl} 
                className="w-full h-full object-cover"
                autoPlay muted loop playsInline
              />
            ) : (
              <img 
                src={currentConfession.mediaUrl || currentConfession.mediaUrls?.[0]} 
                className="w-full h-full object-cover"
                alt=""
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--primary))] via-black/90 to-black" />
        )}

        {/* Content overlay */}
        <div className="absolute bottom-24 left-0 right-16 px-5 z-10">
          {/* Author */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10 border-2 border-white/30">
              <AvatarImage src={authorAvatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${currentConfession.userId || 'anon'}`} />
              <AvatarFallback className="bg-white/20 text-white text-sm">
                {authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold text-sm">{authorName}</p>
              <p className="text-white/60 text-xs">{timeAgo}</p>
            </div>
          </div>

          {/* Text */}
          <p className="text-white text-base leading-relaxed mb-3 line-clamp-6">
            {currentConfession.content}
          </p>

          {/* Tags */}
          {currentConfession.tags && currentConfession.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {currentConfession.tags.map((tag, i) => (
                <span key={i} className="text-xs text-primary font-medium">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Right side actions (TikTok style) */}
        <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-6">
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <div className={`p-2.5 rounded-full ${reactionData?.userHasLiked ? 'bg-red-500/20' : 'bg-white/10'} backdrop-blur-sm`}>
              <Heart className={`h-6 w-6 ${reactionData?.userHasLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
            </div>
            <span className="text-white text-xs font-medium">{reactionData?.heartCount || 0}</span>
          </button>

          <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
            <div className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-white text-xs font-medium">{commentCount}</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm">
              <Bookmark className="h-6 w-6 text-white" />
            </div>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm">
              <Share2 className="h-6 w-6 text-white" />
            </div>
          </button>
        </div>

        {/* Scroll hints */}
        {currentIndex > 0 && (
          <button onClick={() => goTo(currentIndex - 1)} className="absolute top-16 left-1/2 -translate-x-1/2 z-10 animate-bounce">
            <ChevronUp className="h-6 w-6 text-white/40" />
          </button>
        )}
        {currentIndex < confessions.length - 1 && (
          <button onClick={() => goTo(currentIndex + 1)} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce">
            <ChevronDown className="h-6 w-6 text-white/40" />
          </button>
        )}
      </div>

      {/* Comments modal */}
      {showComments && currentConfession && (
        <UnifiedCommentModal
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          confessionId={currentConfession.id}
          confessionContent={currentConfession.content}
          confessionAuthor={authorName}
        />
      )}
    </div>
  );
}
