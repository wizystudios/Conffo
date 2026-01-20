import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Send } from 'lucide-react';
import { Confession } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { haptic } from '@/utils/hapticFeedback';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SwipeableConfessionViewerProps {
  confessions: Confession[];
  onUpdate?: () => void;
}

export function SwipeableConfessionViewer({ confessions, onUpdate }: SwipeableConfessionViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [reply, setReply] = useState('');
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const currentConfession = confessions[currentIndex];

  // Fetch reactions for current confession
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

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    haptic.light();
    if (direction === 'left' && currentIndex < confessions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, confessions.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const threshold = 50;
    
    if (distance > threshold) {
      handleSwipe('left');
    } else if (distance < -threshold) {
      handleSwipe('right');
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleLike = async () => {
    if (!user || !currentConfession) return;
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

  const handleReply = async () => {
    if (!user || !currentConfession || !reply.trim()) return;
    haptic.light();
    
    await supabase
      .from('comments')
      .insert({
        confession_id: currentConfession.id,
        user_id: user.id,
        content: reply.trim()
      });
    
    setReply('');
    onUpdate?.();
  };

  if (!currentConfession || confessions.length === 0) {
    return (
      <div className="conffo-glass-card p-8 mx-4 text-center">
        <p className="text-muted-foreground">No confessions in this room yet.</p>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(currentConfession.timestamp), { addSuffix: false });

  return (
    <div className="relative px-4">
      {/* Reaction emojis row */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button className="text-2xl hover:scale-125 transition-transform">💔</button>
        <button className="text-2xl hover:scale-125 transition-transform">😢</button>
        <button className="text-2xl hover:scale-125 transition-transform">😤</button>
        <button className="text-2xl hover:scale-125 transition-transform">🫂</button>
      </div>

      {/* Main card with swipe */}
      <div
        ref={containerRef}
        className="conffo-glass-card-featured p-6 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation arrows */}
        <button 
          onClick={() => handleSwipe('right')}
          className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 backdrop-blur-sm transition-opacity ${
            currentIndex === 0 ? 'opacity-30 pointer-events-none' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <button 
          onClick={() => handleSwipe('left')}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 backdrop-blur-sm transition-opacity ${
            currentIndex === confessions.length - 1 ? 'opacity-30 pointer-events-none' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="text-center px-8">
          <span className="text-xs text-muted-foreground mb-2 block">Anonymous · {timeAgo}</span>
          <p className="text-lg font-medium leading-relaxed mb-6">
            {currentConfession.content}
          </p>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-8">
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
              <span className="text-pink-400 font-medium">{reactionData?.heartCount || 0}</span>
            </button>
            
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary/70" />
              <span className="text-muted-foreground">{commentCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Swipe indicator */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        <span>Swipe to read confessions</span>
        <ChevronRight className="h-4 w-4" />
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {confessions.slice(0, 5).map((_, i) => (
          <div 
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === currentIndex 
                ? 'w-6 bg-primary' 
                : 'w-1.5 bg-muted-foreground/30'
            }`}
          />
        ))}
        {confessions.length > 5 && (
          <span className="text-xs text-muted-foreground ml-1">+{confessions.length - 5}</span>
        )}
      </div>

      {/* Reply input */}
      <div className="conffo-glass-card p-3 mt-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm">✏️</span>
        </div>
        <Input
          placeholder="Reply to confession..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="flex-1 bg-transparent border-0 focus-visible:ring-0 px-0"
          onKeyDown={(e) => e.key === 'Enter' && handleReply()}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleReply}
          disabled={!reply.trim()}
          className="shrink-0 text-primary"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
