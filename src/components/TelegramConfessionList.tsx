import { memo, useState, useRef } from 'react';
import { Heart, MessageCircle, Lightbulb, MoreHorizontal } from 'lucide-react';
import { Confession } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { haptic } from '@/utils/hapticFeedback';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CinematicVideoPlayer } from '@/components/CinematicVideoPlayer';
import { toast } from '@/hooks/use-toast';

interface TelegramConfessionListProps {
  confessions: Confession[];
  onUpdate?: () => void;
  onOpenComments?: (confessionId: string) => void;
}

// Individual confession card - Telegram style: minimal, clean, readable
const ConfessionItem = memo(function ConfessionItem({ 
  confession, 
  onUpdate,
  onOpenComments 
}: { 
  confession: Confession; 
  onUpdate?: () => void;
  onOpenComments?: (id: string) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  // Fetch author profile
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

  // Fetch reactions
  const { data: reactionData } = useQuery({
    queryKey: ['reactions', confession.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reactions')
        .select('id, type, user_id')
        .eq('confession_id', confession.id);
      
      const feltThis = data?.filter(r => r.type === 'heart').length || 0;
      const userFelt = data?.some(r => r.user_id === user?.id && r.type === 'heart') || false;
      
      return { feltThis, userFelt };
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

  const handleReaction = async (type: 'felt' | 'changed') => {
    if (!user) {
      toast({ title: "Sign in to react", variant: "destructive" });
      return;
    }
    haptic.light();
    
    const reactionType = type === 'felt' ? 'heart' : 'like';
    
    if (type === 'felt' && reactionData?.userFelt) {
      await supabase
        .from('reactions')
        .delete()
        .eq('confession_id', confession.id)
        .eq('user_id', user.id)
        .eq('type', 'heart');
    } else {
      await supabase
        .from('reactions')
        .upsert({
          confession_id: confession.id,
          user_id: user.id,
          type: reactionType
        }, { onConflict: 'confession_id,user_id,type' });
    }
    
    queryClient.invalidateQueries({ queryKey: ['reactions', confession.id] });
    onUpdate?.();
  };

  const timeAgo = formatDistanceToNow(new Date(confession.timestamp), { addSuffix: false });
  const displayName = authorProfile?.username || 'Anonymous';
  const isLongContent = confession.content.length > 280;
  const displayContent = expanded || !isLongContent 
    ? confession.content 
    : confession.content.slice(0, 280) + '...';

  // Check for media
  const hasMedia = confession.mediaUrls?.length || confession.mediaUrl;
  const mediaUrls = confession.mediaUrls || (confession.mediaUrl ? [confession.mediaUrl] : []);
  const mediaTypes = confession.mediaTypes || (confession.mediaType ? [confession.mediaType] : []);

  return (
    <article className="border-b border-border/50 px-4 py-4 hover:bg-muted/20 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage 
            src={authorProfile?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${confession.id}`} 
            alt={displayName} 
          />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Name + time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground">· {timeAgo}</span>
          </div>

          {/* Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {displayContent}
          </p>
          
          {isLongContent && !expanded && (
            <button 
              onClick={() => setExpanded(true)}
              className="text-xs text-primary font-medium mt-1"
            >
              Read more
            </button>
          )}

          {/* Media - Cinematic video or images */}
          {hasMedia && mediaUrls.length > 0 && (
            <div className="mt-3 rounded-xl overflow-hidden">
              {mediaTypes[0] === 'video' ? (
                <CinematicVideoPlayer 
                  src={mediaUrls[0]} 
                  confessionId={confession.id}
                />
              ) : (
                <img 
                  src={mediaUrls[0]} 
                  alt="Media" 
                  className="w-full max-h-80 object-cover rounded-xl"
                  loading="lazy"
                />
              )}
            </div>
          )}

          {/* Actions - Meaningful reactions */}
          <div className="flex items-center gap-6 mt-3">
            {/* Comments */}
            <button 
              onClick={() => onOpenComments?.(confession.id)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              {commentCount > 0 && (
                <span className="text-xs">{commentCount}</span>
              )}
            </button>

            {/* "Felt this" reaction */}
            <button 
              onClick={() => handleReaction('felt')}
              className={`flex items-center gap-1.5 transition-colors ${
                reactionData?.userFelt 
                  ? 'text-red-500' 
                  : 'text-muted-foreground hover:text-red-500'
              }`}
            >
              <Heart className={`h-4 w-4 ${reactionData?.userFelt ? 'fill-current' : ''}`} />
              {(reactionData?.feltThis || 0) > 0 && (
                <span className="text-xs">{reactionData?.feltThis}</span>
              )}
            </button>

            {/* "Changed my view" reaction */}
            <button 
              onClick={() => handleReaction('changed')}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-amber-500 transition-colors"
            >
              <Lightbulb className="h-4 w-4" />
            </button>

            {/* More */}
            <button className="ml-auto text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

export function TelegramConfessionList({ 
  confessions, 
  onUpdate,
  onOpenComments 
}: TelegramConfessionListProps) {
  if (confessions.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-muted-foreground">No confessions in this room yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Be the first to share.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {confessions.map((confession) => (
        <ConfessionItem 
          key={confession.id} 
          confession={confession} 
          onUpdate={onUpdate}
          onOpenComments={onOpenComments}
        />
      ))}
    </div>
  );
}
