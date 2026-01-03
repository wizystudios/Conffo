import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const EMOJI_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '👎'];

interface MessageReactionsProps {
  messageId: string;
  reactions?: { emoji: string; userId: string }[];
  onReactionChange?: () => void;
}

export function MessageReactions({ messageId, reactions = [], onReactionChange }: MessageReactionsProps) {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [localReactions, setLocalReactions] = useState(reactions);

  // Group reactions by emoji
  const groupedReactions = localReactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction.userId);
    return acc;
  }, {} as Record<string, string[]>);

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    
    const existingReaction = localReactions.find(r => r.userId === user.id && r.emoji === emoji);
    
    if (existingReaction) {
      // Remove reaction
      setLocalReactions(prev => prev.filter(r => !(r.userId === user.id && r.emoji === emoji)));
    } else {
      // Add reaction
      setLocalReactions(prev => [...prev, { emoji, userId: user.id }]);
    }
    
    setShowPicker(false);
    onReactionChange?.();
  };

  const userHasReacted = (emoji: string) => {
    return localReactions.some(r => r.userId === user?.id && r.emoji === emoji);
  };

  return (
    <div className="relative">
      {/* Display existing reactions */}
      {Object.keys(groupedReactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(groupedReactions).map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${
                userHasReacted(emoji) 
                  ? 'bg-primary/20 border border-primary/50' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <span>{emoji}</span>
              <span className="text-[10px]">{users.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reaction picker */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-1 flex gap-1 p-1.5 bg-background border border-border rounded-full shadow-lg z-10">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`text-lg hover:scale-125 transition-transform p-1 ${
                userHasReacted(emoji) ? 'opacity-50' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple emoji picker trigger for message bubbles
interface EmojiReactionTriggerProps {
  onToggle: () => void;
  isOpen: boolean;
}

export function EmojiReactionTrigger({ onToggle, isOpen }: EmojiReactionTriggerProps) {
  return (
    <button
      onClick={onToggle}
      className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity ${isOpen ? 'opacity-100' : ''}`}
    >
      😊
    </button>
  );
}