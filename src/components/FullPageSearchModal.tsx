import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, Hash, User, ArrowLeft } from 'lucide-react';
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

interface FullPageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function FullPageSearchModal({ isOpen, onClose, initialQuery = '' }: FullPageSearchModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState(initialQuery);

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['fullpage-search', query, user?.id],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];
      
      const results: SearchResult[] = [];
      
      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id || '')
        .limit(10);
      
      if (users) {
        results.push(...users.map(user => ({
          type: 'user' as const,
          id: user.id,
          title: user.username || 'Anonymous',
          subtitle: user.username || 'anonymous',
          avatar: user.avatar_url
        })));
      }
      
      // Search confessions
      const { data: confessions } = await supabase
        .from('confessions')
        .select('id, content, user_id')
        .ilike('content', `%${query}%`)
        .limit(15);
      
      if (confessions) {
        results.push(...confessions.map(confession => ({
          type: 'post' as const,
          id: confession.id,
          title: confession.content.slice(0, 80) + (confession.content.length > 80 ? '...' : ''),
          subtitle: 'Anonymous confession'
        })));
      }
      
      // Create some sample rooms for search
      const sampleRooms = ['random', 'relationships', 'work', 'family', 'friends', 'school'];
      const matchingRooms = sampleRooms.filter(room => 
        room.toLowerCase().includes(query.toLowerCase())
      );
      results.push(...matchingRooms.map(room => ({
        type: 'room' as const,
        id: room,
        title: room,
        subtitle: 'Chat room'
      })));
      
      return results;
    },
    enabled: query.length >= 2 && isOpen,
    staleTime: 30000
  });

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleResultClick = () => {
    handleClose();
  };

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Curved top header */}
      <div className="relative bg-background border-b border-border">
        <div className="absolute inset-x-0 bottom-0 h-6 bg-background">
          <div className="absolute inset-x-0 bottom-0 h-6 bg-muted rounded-t-[32px]" />
        </div>
        
        <div className="relative px-4 py-6 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-10 w-10 p-0 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Search</h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search users, posts, or rooms..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="pl-12 pr-12 h-12 text-lg rounded-full bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search results - raised from bottom */}
      <div className="flex-1 bg-muted min-h-0 animate-in slide-in-from-bottom-4 duration-300">
        <div className="h-full overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-6 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Start searching</h3>
              <p className="text-muted-foreground">
                Type at least 2 characters to search for users, posts, and rooms
              </p>
            </div>
          ) : isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted-foreground/20 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
                        <div className="h-3 bg-muted-foreground/20 rounded w-1/3" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-6 space-y-4">
              {/* Group results by type */}
              {['user', 'post', 'room'].map((type) => {
                const typeResults = searchResults.filter(result => result.type === type);
                if (typeResults.length === 0) return null;
                
                return (
                  <div key={type} className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {type === 'user' ? 'Users' : type === 'post' ? 'Posts' : 'Rooms'} ({typeResults.length})
                    </h3>
                    <div className="space-y-2">
                      {typeResults.map((result) => (
                        <Link
                          key={`${result.type}-${result.id}`}
                          to={
                            result.type === 'user' 
                              ? `/profile/${result.id}` 
                              : result.type === 'room'
                              ? `/room/${result.id}`
                              : `/confession/${result.id}`
                          }
                          onClick={handleResultClick}
                        >
                          <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer border-0 shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                {result.type === 'user' ? (
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={result.avatar || ''} />
                                    <AvatarFallback>
                                      <User className="h-6 w-6" />
                                    </AvatarFallback>
                                  </Avatar>
                                ) : result.type === 'room' ? (
                                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Hash className="h-6 w-6 text-primary" />
                                  </div>
                                ) : (
                                  <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                                    <Search className="h-6 w-6" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-medium truncate">{result.title}</p>
                                {result.subtitle && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {result.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-muted-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try searching with different keywords
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}