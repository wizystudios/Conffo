
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare, MessageCircle, Heart, AlertCircle, Bookmark, BookmarkCheck, Share, Download } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoomBadge } from './RoomBadge';
import { UsernameDisplay } from './UsernameDisplay';
import { useAuth } from '@/context/AuthContext';
import { toggleReaction, saveConfession } from '@/services/supabaseDataService';
import { Confession, Reaction } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReactionButtonProps {
  icon: React.ReactNode;
  count: number;
  isActive?: boolean;
  onClick: () => void;
  label: string;
}

const ReactionButton = ({ icon, count, isActive, onClick, label }: ReactionButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex items-center gap-1 ${isActive ? 'bg-secondary' : ''}`}
          onClick={onClick}
        >
          {icon}
          <span>{count}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface ConfessionCardProps {
  confession: Confession;
  detailed?: boolean;
  onUpdate?: () => void;
}

export function ConfessionCard({ confession, detailed = false, onUpdate }: ConfessionCardProps) {
  const { user, isAuthenticated } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const tapTimer = useRef<NodeJS.Timeout | null>(null);
  const tapCount = useRef(0);
  const lastTap = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Check if this confession is saved by the current user
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('saved_confessions')
          .select('id')
          .eq('confession_id', confession.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!error && data) {
          setIsSaved(true);
        }
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };
    
    checkIfSaved();
  }, [confession.id, user]);
  
  // Implement Intersection Observer for video autoplay
  useEffect(() => {
    if (confession.mediaType === 'video' && !detailed) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Get the video element inside the observed container
              const video = entry.target.querySelector('video') as HTMLVideoElement;
              if (video) {
                videoRef.current = video;
                video.play().catch(err => console.error('Autoplay failed:', err));
              }
            } else {
              const video = entry.target.querySelector('video') as HTMLVideoElement;
              if (video) {
                video.pause();
              }
            }
          });
        },
        { threshold: 0.6 } // Video plays when 60% visible
      );
      
      if (cardRef.current) {
        observer.observe(cardRef.current);
      }
      
      return () => {
        if (cardRef.current) {
          observer.unobserve(cardRef.current);
        }
      };
    }
  }, [confession.mediaType, detailed]);
  
  const handleReaction = async (reaction: Reaction) => {
    if (!user || isUpdating) return;
    
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        description: "Please sign in to react to confessions",
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await toggleReaction(confession.id, user.id, reaction);
      
      if (onUpdate) {
        onUpdate();
      }
      
      // No toast notification for better UX
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({
        variant: "destructive",
        description: "Failed to record your reaction",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSaveConfession = async () => {
    if (!user || isUpdating) return;
    
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        description: "Please sign in to save confessions",
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const result = await saveConfession(confession.id, user.id);
      
      if (result) {
        setIsSaved(!isSaved);
        // No toast notification for better UX
      }
    } catch (error) {
      console.error('Error saving confession:', error);
      toast({
        variant: "destructive",
        description: "Failed to save confession",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleShareConfession = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ConfessZone Confession',
          text: `${confession.content.substring(0, 50)}...`,
          url: `${window.location.origin}/confession/${confession.id}`
        });
      } else {
        // Fallback for browsers that don't support native sharing
        navigator.clipboard.writeText(`${window.location.origin}/confession/${confession.id}`);
        toast({
          description: "Link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing confession:', error);
    }
  };
  
  const downloadConfession = () => {
    // Create text content
    const text = `
      Confession from ${new Date(confession.timestamp).toLocaleString()}
      Room: ${confession.room}
      
      ${confession.content}
      
      Reactions:
      👍 ${confession.reactions.like} | 😂 ${confession.reactions.laugh} | 😲 ${confession.reactions.shock} | ❤️ ${confession.reactions.heart}
      
      Comments: ${confession.commentCount}
      
      Downloaded from ConfessZone
    `.trim();
    
    // Create blob and download link
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confession-${confession.id.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Handle double tap to like
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) { // 300ms between taps for double-tap
      tapCount.current++;
      if (tapCount.current === 2) {
        // Double tap detected
        handleReaction('heart');
        tapCount.current = 0;
      }
    } else {
      tapCount.current = 1;
    }
    lastTap.current = now;
  };
  
  // Handle long press to download
  const handleTouchStart = () => {
    tapTimer.current = setTimeout(() => {
      downloadConfession();
    }, 800); // 800ms for long press
  };
  
  const handleTouchEnd = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
  };
  
  const userReactions = confession.userReactions || [];
  
  return (
    <Card 
      ref={cardRef} 
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className="touch-none"
    >
      <CardContent className={detailed ? "pt-6" : "pt-4"}>
        <div className="flex justify-between items-center mb-4">
          <Link to={`/user/${confession.userId}`} className="hover:opacity-80">
            <UsernameDisplay userId={confession.userId} size="md" />
          </Link>
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
          </span>
        </div>
        
        <div className={`${detailed ? 'text-lg' : ''} mt-2 mb-3`}>
          {confession.content}
        </div>
        
        {confession.mediaUrl && (
          <div className="rounded-md overflow-hidden mb-3 border">
            {confession.mediaType === 'image' ? (
              <img 
                src={confession.mediaUrl} 
                alt="Confession media" 
                className="w-full h-auto max-h-[400px] object-contain"
                loading="lazy"
              />
            ) : confession.mediaType === 'video' ? (
              <video 
                src={confession.mediaUrl} 
                controls 
                preload="metadata"
                playsInline
                className="w-full h-auto max-h-[400px]"
              />
            ) : null}
          </div>
        )}
        
        {!detailed && (
          <div className="flex mt-4">
            <RoomBadge room={confession.room} />
          </div>
        )}
        
        {detailed && (
          <div className="flex justify-between items-center mt-4">
            <RoomBadge room={confession.room} />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-3 pb-2">
        <div className="flex gap-1">
          <ReactionButton 
            icon={<ThumbsUp className="h-4 w-4" />} 
            count={confession.reactions.like} 
            isActive={userReactions.includes('like')}
            onClick={() => handleReaction('like')}
            label="Like"
          />
          <ReactionButton 
            icon={<Heart className="h-4 w-4" />} 
            count={confession.reactions.heart} 
            isActive={userReactions.includes('heart')}
            onClick={() => handleReaction('heart')}
            label="Love"
          />
        </div>
        
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1" 
                onClick={handleSaveConfession}
              >
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                <span className="hidden sm:inline">Save</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1" 
                onClick={handleShareConfession}
              >
                <Share className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
                onClick={downloadConfession}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </>
          )}
          {!detailed && (
            <Link to={`/confession/${confession.id}`}>
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{confession.commentCount}</span>
              </Button>
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
