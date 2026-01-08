import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface MentionSuggestion {
  id: string;
  name: string;
  type: 'user' | 'community';
  avatarUrl?: string;
}

interface MentionAutocompleteProps {
  inputValue: string;
  cursorPosition: number;
  onSelect: (mention: MentionSuggestion, startIndex: number, endIndex: number) => void;
  isVisible: boolean;
  onClose: () => void;
  containerRef?: React.RefObject<HTMLElement>;
}

export function MentionAutocomplete({ 
  inputValue, 
  cursorPosition, 
  onSelect, 
  isVisible,
  onClose 
}: MentionAutocompleteProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find the @ symbol position and search query
  const getMentionQuery = () => {
    const textBeforeCursor = inputValue.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex === -1) return null;
    
    // Check if @ is at start or preceded by whitespace
    if (atIndex > 0 && !/\s/.test(textBeforeCursor[atIndex - 1])) {
      return null;
    }
    
    const query = textBeforeCursor.slice(atIndex + 1);
    
    // If there's a space after the query, we're not in mention mode
    if (query.includes(' ')) return null;
    
    return { query, startIndex: atIndex };
  };

  useEffect(() => {
    const mentionData = getMentionQuery();
    
    if (!mentionData || !isVisible) {
      setSuggestions([]);
      return;
    }

    const { query } = mentionData;
    
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const results: MentionSuggestion[] = [];
        
        // Fetch users
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', user?.id || '')
          .ilike('username', `%${query}%`)
          .limit(5);
        
        if (users) {
          results.push(...users.map(u => ({
            id: u.id,
            name: u.username || 'Anonymous',
            type: 'user' as const,
            avatarUrl: u.avatar_url
          })));
        }
        
        // Fetch communities the user is a member of
        if (user?.id) {
          const { data: memberships } = await supabase
            .from('community_members')
            .select('community_id, communities(id, name, image_url)')
            .eq('user_id', user.id);
          
          if (memberships) {
            const communityResults = memberships
              .map(m => (m as any).communities)
              .filter(c => c && c.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5)
              .map(c => ({
                id: c.id,
                name: c.name,
                type: 'community' as const,
                avatarUrl: c.image_url
              }));
            
            results.push(...communityResults);
          }
        }
        
        setSuggestions(results);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Error fetching mention suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [inputValue, cursorPosition, isVisible, user?.id]);

  const handleSelect = (suggestion: MentionSuggestion) => {
    const mentionData = getMentionQuery();
    if (!mentionData) return;
    
    const { startIndex } = mentionData;
    onSelect(suggestion, startIndex, cursorPosition);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      {loading ? (
        <div className="p-3 text-center text-muted-foreground text-sm">
          Searching...
        </div>
      ) : (
        suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.type}-${suggestion.id}`}
            onClick={() => handleSelect(suggestion)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              index === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
            }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={suggestion.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {suggestion.type === 'community' ? (
                  <Users className="h-4 w-4" />
                ) : (
                  suggestion.name.charAt(0).toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">@{suggestion.name}</p>
              <p className="text-xs text-muted-foreground">
                {suggestion.type === 'community' ? 'Community' : 'User'}
              </p>
            </div>
            {suggestion.type === 'community' ? (
              <Users className="h-4 w-4 text-muted-foreground" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ))
      )}
    </div>
  );
}

// Hook to manage mention autocomplete state
export function useMentionAutocomplete() {
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleInputChange = (value: string, selectionStart: number | null) => {
    setCursorPosition(selectionStart || value.length);
    
    // Check if we should show mentions
    const textBeforeCursor = value.slice(0, selectionStart || value.length);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Show if @ is at start or after space, and no space in the query
      if ((atIndex === 0 || /\s/.test(value[atIndex - 1])) && !textAfterAt.includes(' ')) {
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const insertMention = (
    currentValue: string,
    mention: MentionSuggestion,
    startIndex: number,
    endIndex: number
  ): string => {
    const before = currentValue.slice(0, startIndex);
    const after = currentValue.slice(endIndex);
    return `${before}@${mention.name} ${after}`;
  };

  return {
    showMentions,
    setShowMentions,
    cursorPosition,
    handleInputChange,
    insertMention
  };
}
