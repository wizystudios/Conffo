import { useState, useRef, useCallback, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bookmark, 
  Lightbulb, 
  Heart, 
  MessageCircle, 
  ChevronDown,
  Sparkles,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Confession } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { haptic } from '@/utils/hapticFeedback';
import { cn } from '@/lib/utils';

interface ConfessionJourneyProps {
  confessions: Confession[];
  onUpdate?: () => void;
  onOpenComments?: (confessionId: string) => void;
}

// Meaningful reaction types instead of likes
type MeaningfulReaction = 'felt_this' | 'changed_my_view' | 'worth_sharing';

const reactionConfig: Record<MeaningfulReaction, { icon: string; label: string; color: string }> = {
  felt_this: { icon: '💫', label: 'Felt this', color: 'text-purple-400' },
  changed_my_view: { icon: '🔮', label: 'Changed my view', color: 'text-blue-400' },
  worth_sharing: { icon: '✨', label: 'Worth sharing', color: 'text-amber-400' },
};

export function ConfessionJourney({ confessions, onUpdate, onOpenComments }: ConfessionJourneyProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReflections, setShowReflections] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [ambientSound, setAmbientSound] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentConfession = confessions[currentIndex];
  const dailyLimit = Math.min(confessions.length, 7); // Intentional limit
  const isLastConfession = currentIndex >= dailyLimit - 1;

  // Fetch reactions for current confession
  const { data: reactionData, refetch: refetchReactions } = useQuery({
    queryKey: ['reactions', currentConfession?.id],
    queryFn: async () => {
      if (!currentConfession) return { counts: {}, userReacted: null };
      
      const { data } = await supabase
        .from('reactions')
        .select('id, type, user_id')
        .eq('confession_id', currentConfession.id);
      
      const counts = {
        heart: data?.filter(r => r.type === 'heart').length || 0,
        like: data?.filter(r => r.type === 'like').length || 0,
      };
      const userReacted = data?.find(r => r.user_id === user?.id)?.type || null;
      
      return { counts, userReacted };
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

  // Fetch related confessions (reflections)
  const { data: reflections = [] } = useQuery({
    queryKey: ['reflections', currentConfession?.id],
    queryFn: async () => {
      if (!currentConfession) return [];
      
      // Get confessions from same room with similar themes
      const { data } = await supabase
        .from('confessions')
        .select('id, content, created_at')
        .eq('room_id', currentConfession.room)
        .neq('id', currentConfession.id)
        .limit(3);
      
      return data || [];
    },
    enabled: !!currentConfession && showReflections,
  });

  // Hold gesture for reflections
  const startHold = useCallback(() => {
    setIsHolding(true);
    let progress = 0;
    
    holdTimerRef.current = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);
      
      if (progress >= 100) {
        haptic.medium();
        setShowReflections(true);
        setIsHolding(false);
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      }
    }, 20);
  }, []);

  const endHold = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
    }
  }, []);

  // Navigation
  const goNext = useCallback(() => {
    if (isLastConfession) {
      setJourneyComplete(true);
      haptic.success();
    } else {
      setCurrentIndex(prev => prev + 1);
      setShowReflections(false);
      haptic.light();
    }
  }, [isLastConfession]);

  const goDeeper = useCallback(() => {
    // Swipe right = go deeper into related content
    if (reflections.length > 0) {
      setShowReflections(true);
      haptic.medium();
    }
  }, [reflections.length]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    startHold();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStart.x;
    if (Math.abs(deltaX) > 30) {
      endHold();
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    }
  };

  const handleTouchEnd = () => {
    endHold();
    
    if (swipeDirection === 'left') {
      goNext();
    } else if (swipeDirection === 'right') {
      goDeeper();
    }
    
    setSwipeDirection(null);
  };

  // Save/React to confession
  const handleReaction = async (type: 'heart' | 'like') => {
    if (!user || !currentConfession) return;
    haptic.medium();
    
    if (reactionData?.userReacted === type) {
      // Remove reaction
      await supabase
        .from('reactions')
        .delete()
        .eq('confession_id', currentConfession.id)
        .eq('user_id', user.id)
        .eq('type', type);
    } else {
      // Remove existing and add new
      await supabase
        .from('reactions')
        .delete()
        .eq('confession_id', currentConfession.id)
        .eq('user_id', user.id);
        
      await supabase
        .from('reactions')
        .insert({
          confession_id: currentConfession.id,
          user_id: user.id,
          type
        });
    }
    
    refetchReactions();
    onUpdate?.();
  };

  const handleSave = async () => {
    if (!user || !currentConfession) return;
    haptic.light();
    
    const { data: existing } = await supabase
      .from('saved_confessions')
      .select('id')
      .eq('confession_id', currentConfession.id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existing) {
      await supabase
        .from('saved_confessions')
        .delete()
        .eq('id', existing.id);
    } else {
      await supabase
        .from('saved_confessions')
        .insert({
          confession_id: currentConfession.id,
          user_id: user.id
        });
    }
  };

  // Journey complete screen
  if (journeyComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="conffo-glass-card-featured p-8 max-w-sm">
          <div className="text-4xl mb-4">🌟</div>
          <h2 className="text-xl font-bold mb-2">Journey Complete</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You've experienced today's confessions with intention. 
            Take a moment to reflect.
          </p>
          <div className="text-xs text-muted-foreground mb-4">
            Come back tomorrow for new perspectives.
          </div>
          <button
            onClick={() => {
              setJourneyComplete(false);
              setCurrentIndex(0);
            }}
            className="px-6 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  if (!currentConfession || confessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="conffo-glass-card p-8">
          <div className="text-3xl mb-4">🌙</div>
          <p className="text-muted-foreground">
            No confessions in this room yet.
          </p>
        </div>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(currentConfession.timestamp), { addSuffix: false });

  return (
    <div 
      ref={containerRef}
      className="relative h-full flex flex-col"
    >
      {/* Ambient sound toggle */}
      <button
        onClick={() => setAmbientSound(!ambientSound)}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-background/50 backdrop-blur-sm"
      >
        {ambientSound ? (
          <Volume2 className="h-4 w-4 text-primary" />
        ) : (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Progress indicator - intentional, not infinite */}
      <div className="absolute top-4 left-4 right-12 z-20 flex gap-1">
        {Array.from({ length: dailyLimit }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i < currentIndex 
                ? "bg-primary" 
                : i === currentIndex 
                  ? "bg-primary/60" 
                  : "bg-muted/30"
            )}
          />
        ))}
      </div>

      {/* Main confession content - editorial, magazine-like */}
      <div 
        className="flex-1 flex flex-col justify-center px-6 pt-12 pb-24"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
      >
        {/* Hold progress indicator */}
        {isHolding && holdProgress > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-30">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="hsl(var(--muted))"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="hsl(var(--primary))"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={251}
                  strokeDashoffset={251 - (251 * holdProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <p className="absolute bottom-1/3 text-sm text-muted-foreground">
              Hold to reveal reflections...
            </p>
          </div>
        )}

        {/* Reflections panel */}
        {showReflections && (
          <div className="absolute inset-0 z-40 bg-background/95 backdrop-blur-lg p-6 overflow-auto">
            <button
              onClick={() => setShowReflections(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-muted/50"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="pt-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Related Reflections
              </h3>
              
              {reflections.length > 0 ? (
                <div className="space-y-4">
                  {reflections.map((reflection) => (
                    <div 
                      key={reflection.id}
                      className="conffo-glass-card p-4"
                    >
                      <p className="text-sm leading-relaxed line-clamp-4">
                        {reflection.content}
                      </p>
                      <span className="text-xs text-muted-foreground mt-2 block">
                        {formatDistanceToNow(new Date(reflection.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No related confessions found.
                </p>
              )}
            </div>
          </div>
        )}

        {/* The confession - editorial typography */}
        <div className={cn(
          "transition-all duration-500",
          swipeDirection === 'left' && "opacity-50 -translate-x-8",
          swipeDirection === 'right' && "opacity-50 translate-x-8"
        )}>
          {/* Time and context */}
          <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
            <span className="uppercase tracking-wider">Anonymous</span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>

          {/* Main confession text - large, editorial */}
          <blockquote className="text-xl md:text-2xl font-serif leading-relaxed mb-8">
            "{currentConfession.content}"
          </blockquote>

          {/* Media if present */}
          {currentConfession.mediaUrl && currentConfession.mediaType === 'image' && (
            <div className="rounded-xl overflow-hidden mb-6 aspect-video bg-muted">
              <img 
                src={currentConfession.mediaUrl} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Swipe hints */}
          <div className="flex justify-between text-xs text-muted-foreground/60 mt-8">
            <span className="flex items-center gap-1">
              ← Swipe to continue
            </span>
            <span className="flex items-center gap-1">
              Swipe for depth →
            </span>
          </div>
        </div>
      </div>

      {/* Meaningful actions bar - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/80 to-transparent">
        <div className="conffo-glass-card p-3">
          <div className="flex items-center justify-around">
            {/* Felt This (Heart) */}
            <button
              onClick={() => handleReaction('heart')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                reactionData?.userReacted === 'heart' && "scale-110"
              )}
            >
              <div className={cn(
                "p-2 rounded-full transition-colors",
                reactionData?.userReacted === 'heart' 
                  ? "bg-primary/20" 
                  : "bg-muted/50"
              )}>
                <Heart className={cn(
                  "h-5 w-5",
                  reactionData?.userReacted === 'heart' 
                    ? "text-primary fill-primary" 
                    : "text-muted-foreground"
                )} />
              </div>
              <span className="text-[10px] text-muted-foreground">Felt this</span>
            </button>

            {/* Changed My View (Like) */}
            <button
              onClick={() => handleReaction('like')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                reactionData?.userReacted === 'like' && "scale-110"
              )}
            >
              <div className={cn(
                "p-2 rounded-full transition-colors",
                reactionData?.userReacted === 'like' 
                  ? "bg-blue-500/20" 
                  : "bg-muted/50"
              )}>
                <Lightbulb className={cn(
                  "h-5 w-5",
                  reactionData?.userReacted === 'like' 
                    ? "text-blue-400 fill-blue-400" 
                    : "text-muted-foreground"
                )} />
              </div>
              <span className="text-[10px] text-muted-foreground">Changed view</span>
            </button>

            {/* Comment */}
            <button
              onClick={() => onOpenComments?.(currentConfession.id)}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-2 rounded-full bg-muted/50">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {commentCount > 0 ? commentCount : 'Reflect'}
              </span>
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-2 rounded-full bg-muted/50">
                <Bookmark className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">Save</span>
            </button>
          </div>
        </div>

        {/* Pull down for next hint */}
        <div className="flex justify-center mt-3">
          <ChevronDown className="h-4 w-4 text-muted-foreground/50 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
