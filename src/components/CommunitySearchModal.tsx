import { useState } from 'react';
import { X, Search, Users, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { searchCommunities, requestToJoinCommunity, Community } from '@/services/communityService';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/utils/hapticFeedback';

interface CommunitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommunitySearchModal({ isOpen, onClose }: CommunitySearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Community[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    const communities = await searchCommunities(query.trim());
    setResults(communities);
    setIsSearching(false);
  };

  const handleRequestJoin = async (communityId: string) => {
    setRequestingId(communityId);
    
    const success = await requestToJoinCommunity(communityId);
    
    if (success) {
      setRequestedIds(prev => new Set([...prev, communityId]));
      haptic.success();
      toast({ description: '✅ Join request sent! Waiting for approval.' });
    } else {
      toast({ variant: 'destructive', description: 'Failed to send request' });
    }
    
    setRequestingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h2 className="text-lg font-bold">Find Communities</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search communities..."
                className="pl-10 rounded-full bg-muted border-0"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !query.trim()}
              className="rounded-full"
            >
              {isSearching ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Search for communities to join</p>
              <p className="text-xs mt-1">Enter a name and tap search</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((community) => (
                <div 
                  key={community.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted/50"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={community.imageUrl} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {community.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{community.name}</p>
                    {community.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{community.description}</p>
                    )}
                  </div>
                  
                  {requestedIds.has(community.id) ? (
                    <Button variant="outline" size="sm" disabled className="rounded-full">
                      Requested
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRequestJoin(community.id)}
                      disabled={requestingId === community.id}
                      className="rounded-full gap-1"
                    >
                      {requestingId === community.id ? (
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3 w-3" />
                          Join
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}