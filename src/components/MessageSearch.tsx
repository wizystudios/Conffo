import { useState, useRef, useEffect } from 'react';
import { Search, X, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Message } from '@/services/chatService';

interface MessageSearchProps {
  messages: Message[];
  onHighlightMessage: (messageId: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function MessageSearch({ messages, onHighlightMessage, isOpen, onClose }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      onHighlightMessage(null);
      return;
    }

    const searchResults = messages.filter(m => 
      m.message_type === 'text' && 
      m.content.toLowerCase().includes(query.toLowerCase())
    );
    
    setResults(searchResults);
    setCurrentIndex(0);
    
    if (searchResults.length > 0) {
      onHighlightMessage(searchResults[0].id);
    } else {
      onHighlightMessage(null);
    }
  }, [query, messages, onHighlightMessage]);

  const navigateResult = (direction: 'prev' | 'next') => {
    if (results.length === 0) return;
    
    let newIndex = currentIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    } else {
      newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    }
    
    setCurrentIndex(newIndex);
    onHighlightMessage(results[newIndex].id);
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onHighlightMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages..."
        className="h-8 border-0 bg-transparent focus-visible:ring-0 px-0"
      />
      {results.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <span>{currentIndex + 1}/{results.length}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => navigateResult('prev')}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => navigateResult('next')}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}