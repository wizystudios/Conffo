import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { haptic } from '@/utils/hapticFeedback';
import { cn } from '@/lib/utils';

type ReactionType = 'like' | 'heart' | 'laugh';

interface MessageReactionPickerProps {
  messageId: string;
  isOpen: boolean;
  onClose: () => void;
  onReactionChange: () => void;
}

interface ReactionCount {
  reaction_type: ReactionType;
  count: number;
  hasUserReacted: boolean;
}

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'like', emoji: '👍' },
  { type: 'heart', emoji: '❤️' },
  { type: 'laugh', emoji: '😂' },
];

export function MessageReactionPicker({ messageId, isOpen, onClose, onReactionChange }: MessageReactionPickerProps) {
  const { user } = useAuth();

  const toggleReaction = async (reactionType: ReactionType) => {
    if (!user) return;
    
    haptic.light();
    
    // Check if reaction exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('reaction_type', reactionType)
      .single();
    
    if (existing) {
      // Remove reaction
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);
    } else {
      // Add reaction
      await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType
        });
    }
    
    onReactionChange();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1 bg-background border border-border rounded-full px-2 py-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
      {REACTIONS.map(({ type, emoji }) => (
        <button
          key={type}
          onClick={() => toggleReaction(type)}
          className="text-lg hover:scale-125 transition-transform p-1"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

interface MessageReactionDisplayProps {
  messageId: string;
  isOwn: boolean;
  refreshKey?: number;
}

export function MessageReactionDisplay({ messageId, isOwn, refreshKey }: MessageReactionDisplayProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ReactionCount[]>([]);

  useEffect(() => {
    loadReactions();
  }, [messageId, refreshKey]);

  const loadReactions = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('message_reactions')
      .select('reaction_type, user_id')
      .eq('message_id', messageId);
    
    if (!data || data.length === 0) {
      setReactions([]);
      return;
    }
    
    // Group by reaction type
    const grouped: Record<ReactionType, { count: number; hasUserReacted: boolean }> = {
      like: { count: 0, hasUserReacted: false },
      heart: { count: 0, hasUserReacted: false },
      laugh: { count: 0, hasUserReacted: false },
    };
    
    data.forEach((r) => {
      const type = r.reaction_type as ReactionType;
      if (grouped[type]) {
        grouped[type].count++;
        if (r.user_id === user.id) {
          grouped[type].hasUserReacted = true;
        }
      }
    });
    
    const result = Object.entries(grouped)
      .filter(([, v]) => v.count > 0)
      .map(([type, v]) => ({
        reaction_type: type as ReactionType,
        count: v.count,
        hasUserReacted: v.hasUserReacted,
      }));
    
    setReactions(result);
  };

  if (reactions.length === 0) return null;

  const getEmoji = (type: ReactionType) => {
    switch (type) {
      case 'like': return '👍';
      case 'heart': return '❤️';
      case 'laugh': return '😂';
    }
  };

  return (
    <div className={cn(
      'flex items-center gap-0.5 mt-1',
      isOwn ? 'justify-end' : 'justify-start'
    )}>
      <div className="flex items-center gap-1 bg-muted/80 rounded-full px-1.5 py-0.5 text-xs">
        {reactions.map(({ reaction_type, count, hasUserReacted }) => (
          <span 
            key={reaction_type} 
            className={cn(
              'flex items-center gap-0.5',
              hasUserReacted && 'font-medium'
            )}
          >
            <span className="text-sm">{getEmoji(reaction_type)}</span>
            {count > 1 && <span className="text-muted-foreground">{count}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}