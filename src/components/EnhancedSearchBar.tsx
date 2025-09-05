import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface SearchResult {
  type: 'user' | 'post' | 'room';
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  roomName?: string;
}

interface EnhancedSearchBarProps {
  onClose?: () => void;
  onResultClick?: (result: SearchResult) => void;
}

export function EnhancedSearchBar({ onClose, onResultClick }: EnhancedSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults = [] } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];

      const results: SearchResult[] = [];

      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(5);

      if (users) {
        results.push(...users.map(user => ({
          type: 'user' as const,
          id: user.id,
          title: user.username || 'Anonymous',
          subtitle: 'User profile',
          avatar: user.avatar_url
        })));
      }

      // Search posts
      const { data: posts } = await supabase
        .from('confessions')
        .select('id, content, user_id')
        .ilike('content', `%${query}%`)
        .limit(5);

      if (posts) {
        results.push(...posts.map(post => ({
          type: 'post' as const,
          id: post.id,
          title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
          subtitle: 'Confession post'
        })));
      }

      // Add predefined rooms
      const rooms = [
        'General', 'Relationships', 'Work', 'School', 'Family', 'Friends',
        'Love', 'Career', 'Health', 'Money', 'Travel', 'Food', 'Technology'
      ];

      const matchingRooms = rooms.filter(room => 
        room.toLowerCase().includes(query.toLowerCase())
      );

      results.push(...matchingRooms.map(room => ({
        type: 'room' as const,
        id: room.toLowerCase(),
        title: `#${room}`,
        subtitle: 'Room'
      })));

      return results;
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowResults(true);
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    onClose?.();
  };

  const handleResultSelect = (result: SearchResult) => {
    setShowResults(false);
    setQuery('');
    onResultClick?.(result);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search users, posts, rooms..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="pl-10 pr-10 rounded-full bg-muted/50 border-none"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && (query.length >= 2) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]" onClick={() => setShowResults(false)} />
      )}
      {showResults && (query.length >= 2) && (
        <Card className="fixed inset-x-4 top-20 z-[9999] max-h-[70vh] overflow-y-auto bg-card/95 backdrop-blur-xl border shadow-2xl animate-slide-in-right">
          {searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((result) => (
                <div key={`${result.type}-${result.id}`}>
                  {result.type === 'user' ? (
                    <Link
                      to={`/user/${result.id}`}
                      onClick={() => handleResultSelect(result)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={result.avatar || `https://api.dicebear.com/7.x/micah/svg?seed=${result.id}`}
                          alt={result.title}
                        />
                        <AvatarFallback>
                          {result.title.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{result.title}</div>
                        <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                      </div>
                    </Link>
                  ) : result.type === 'room' ? (
                    <Link
                      to={`/room/${result.id}`}
                      onClick={() => handleResultSelect(result)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">#</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{result.title}</div>
                        <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                      </div>
                    </Link>
                  ) : (
                    <Link
                      to={`/confession/${result.id}`}
                      onClick={() => handleResultSelect(result)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{result.title}</div>
                        <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                      </div>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
        </Card>
      )}
    </div>
  );
}