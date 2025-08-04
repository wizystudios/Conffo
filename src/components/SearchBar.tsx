import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, Hash, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

interface SearchResult {
  type: 'user' | 'post' | 'room';
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  roomName?: string;
}

interface SearchBarProps {
  onClose?: () => void;
}

export function SearchBar({ onClose }: SearchBarProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['search', query, user?.id],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];
      
      const results: SearchResult[] = [];
      
      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id || '')
        .limit(5);
      
      if (users) {
        results.push(...users.map(user => ({
          type: 'user' as const,
          id: user.id,
          title: user.username || 'Anonymous',
          avatar: user.avatar_url
        })));
      }
      
      // Search confessions
      const { data: confessions } = await supabase
        .from('confessions')
        .select('id, content, user_id')
        .ilike('content', `%${query}%`)
        .limit(10);
      
      if (confessions) {
        results.push(...confessions.map(confession => ({
          type: 'post' as const,
          id: confession.id,
          title: confession.content.slice(0, 50) + (confession.content.length > 50 ? '...' : ''),
          subtitle: 'Anonymous confession'
        })));
      }
      
      // Create some sample rooms for search
      const sampleRooms = ['general', 'relationships', 'work', 'family', 'friends'];
      const matchingRooms = sampleRooms.filter(room => 
        room.toLowerCase().includes(query.toLowerCase())
      );
      results.push(...matchingRooms.map(room => ({
        type: 'room' as const,
        id: room,
        title: room,
        subtitle: 'Room'
      })));
      
      return results;
    },
    enabled: query.length >= 2,
    staleTime: 30000
  });

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    onClose?.();
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users, posts, or rooms..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleClose}
          />
          <Card className="absolute top-full mt-2 w-full z-50 max-h-80 overflow-y-auto">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y">
                  {searchResults.map((result) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      to={
                        result.type === 'user' 
                          ? `/profile?userId=${result.id}` 
                          : result.type === 'room'
                          ? `/rooms?room=${result.id}`
                          : `/confession/${result.id}`
                      }
                      onClick={handleClose}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {result.type === 'user' ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={result.avatar || ''} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        ) : result.type === 'room' ? (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Hash className="h-4 w-4 text-primary" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Search className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}