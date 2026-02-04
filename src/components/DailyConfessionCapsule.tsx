import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Sparkles, Coffee } from 'lucide-react';
import { Confession } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { haptic } from '@/utils/hapticFeedback';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ImprovedCommentModal } from '@/components/ImprovedCommentModal';
import { toast } from '@/hooks/use-toast';

interface DailyConfessionCapsuleProps {
  confessions: Confession[];
  onComplete?: () => void;
  onUpdate?: () => void;
}

export function DailyConfessionCapsule({ confessions, onComplete, onUpdate }: DailyConfessionCapsuleProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Limit to 5-10 curated confessions per day
  const dailyCapsule = confessions.slice(0, 10);
  const currentConfession = dailyCapsule[currentIndex];

  // Fetch reaction data
  const { data: reactionData, refetch: refetchReactions } = useQuery({
    queryKey: ['reactions', currentConfession?.id],
    queryFn: async () => {
      if (!currentConfession) return { heartCount: 0, userHasLiked: false };
      
      const { data } = await supabase
        .from('reactions')
        .select('id, type, user_id')
        .eq('confession_id', currentConfession.id);
      
      const heartCount = data?.filter(r => r.type === 'heart').length || 0;
      const userHasLiked = data?.some(r => r.user_id === user?.id && r.type === 'heart') || false;
      
      return { heartCount, userHasLiked };
    },
    enabled: !!currentConfession,
  });

  // Fetch comment count
  const { data: commentCount = 0 } = useQuery({
    queryKey: ['comment-count', currentConfession?.id],
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

  // Fetch author profile
  const { data: authorProfile } = useQuery({
    queryKey: ['profile', currentConfession?.userId],
    queryFn: async () => {
      if (!currentConfession?.userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', currentConfession.userId)
        .maybeSingle();
      return data;
    },
    enabled: !!currentConfession?.userId,
  });

  const goToNext = () => {
    haptic.light();
    if (currentIndex < dailyCapsule.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Completed all confessions
      onComplete?.();
      toast({
        description: "☕ You've read today's capsule! Check back tomorrow.",
      });
    }
  };

  const goToPrev = () => {
    haptic.light();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
    const diff = e.touches[0].clientX - touchStart;
    setSwipeOffset(diff * 0.3); // Dampen the effect
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const threshold = 50;
    
    if (distance > threshold) {
      goToNext();
    } else if (distance < -threshold) {
      goToPrev();
    }
    
    setTouchStart(0);
    setTouchEnd(0);
    setSwipeOffset(0);
  };

  const handleLike = async () => {
    if (!user || !currentConfession) {
      toast({ title: "Please sign in to like", variant: "destructive" });
      return;
    }
    
    haptic.medium();
    
    if (reactionData?.userHasLiked) {
      await supabase
        .from('reactions')
        .delete()
        .eq('confession_id', currentConfession.id)
        .eq('user_id', user.id)
        .eq('type', 'heart');
    } else {
      await supabase
        .from('reactions')
        .insert({
          confession_id: currentConfession.id,
          user_id: user.id,
          type: 'heart'
        });
    }
    
    refetchReactions();
    onUpdate?.();
  };

  if (!currentConfession || dailyCapsule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Coffee className="h-12 w-12 text-primary/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Confessions Today</h3>
        <p className="text-sm text-muted-foreground text-center">
          Check back later for today's curated confessions.
        </p>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(currentConfession.timestamp), { addSuffix: false });
  const displayName = authorProfile?.username || 'Anonymous';
  const avatarUrl = authorProfile?.avatar_url;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Daily Capsule</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} of {dailyCapsule.length}
        </span>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1 px-4 py-2">
        {dailyCapsule.map((_, index) => (
          <div 
            key={index}
            className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${
              index <= currentIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Confession Card - Full focus */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-200"
          style={{ transform: `translateX(${swipeOffset}px)` }}
        >
          <div className="w-full max-w-md conffo-glass-card-featured p-6 relative">
            {/* Navigation hints */}
            <button 
              onClick={goToPrev}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/50 backdrop-blur-sm transition-opacity ${
                currentIndex === 0 ? 'opacity-20 pointer-events-none' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <button 
              onClick={goToNext}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/50 backdrop-blur-sm transition-opacity ${
                currentIndex === dailyCapsule.length - 1 ? 'opacity-20 pointer-events-none' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Author */}
            <div className="flex items-center gap-2 mb-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-primary/10">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <span className="text-sm font-medium">{displayName}</span>
                <p className="text-xs text-muted-foreground">{timeAgo} ago</p>
              </div>
            </div>

            {/* Content */}
            <p className="text-base leading-relaxed mb-6 min-h-[100px]">
              {currentConfession.content}
            </p>

            {/* Media if exists */}
            {currentConfession.mediaUrl && (
              <div className="rounded-xl overflow-hidden mb-4 aspect-video">
                {currentConfession.mediaType === 'video' ? (
                  <video 
                    src={currentConfession.mediaUrl} 
                    controls 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={currentConfession.mediaUrl} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-8 pt-4 border-t border-border/30">
              <button 
                onClick={handleLike}
                className="flex items-center gap-2 transition-transform active:scale-95"
              >
                <Heart 
                  className={`h-6 w-6 ${
                    reactionData?.userHasLiked 
                      ? 'text-pink-500 fill-pink-500' 
                      : 'text-pink-400'
                  }`} 
                />
                <span className="text-sm font-medium text-pink-400">
                  {reactionData?.heartCount || 0}
                </span>
              </button>
              
              <button 
                onClick={() => setShowComments(true)}
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-5 w-5 text-primary/70" />
                <span className="text-sm text-muted-foreground">{commentCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Swipe hint */}
      <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
        <ChevronLeft className="h-3 w-3" />
        <span>Swipe to navigate</span>
        <ChevronRight className="h-3 w-3" />
      </div>

      {/* Comments Modal */}
      <ImprovedCommentModal
        confessionId={currentConfession.id}
        confessionContent={currentConfession.content}
        confessionAuthor={displayName}
        confessionMediaUrl={currentConfession.mediaUrl || undefined}
        confessionMediaType={currentConfession.mediaType === 'audio' ? undefined : currentConfession.mediaType}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
    </div>
  );
}
