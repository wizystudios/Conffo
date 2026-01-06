import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { StoryViewer } from '@/components/story/StoryViewer';

interface Highlight {
  id: string;
  title: string;
  cover_url: string;
  stories: any[];
}

interface StoryHighlightsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function StoryHighlights({ userId, isOwnProfile = false }: StoryHighlightsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch highlights from localStorage (simulated - in production would use DB)
  const { data: highlights = [], refetch } = useQuery({
    queryKey: ['story-highlights', userId],
    queryFn: async () => {
      const saved = localStorage.getItem(`story_highlights_${userId}`);
      return saved ? JSON.parse(saved) : [];
    },
  });

  // Fetch user's expired stories that can be added to highlights
  const { data: availableStories = [] } = useQuery({
    queryKey: ['available-stories-for-highlights', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOwnProfile && showCreateModal,
  });

  const createHighlight = async () => {
    if (!newTitle.trim() || !user) return;
    
    setIsCreating(true);
    try {
      const newHighlight: Highlight = {
        id: Date.now().toString(),
        title: newTitle.trim(),
        cover_url: availableStories[0]?.media_url || '',
        stories: availableStories.slice(0, 5).map((s: any) => ({
          id: s.id,
          userId: s.user_id,
          mediaUrl: s.media_url,
          mediaType: s.media_type,
          caption: s.caption,
          createdAt: s.created_at,
          expiresAt: s.expires_at,
        })),
      };
      
      const updated = [...highlights, newHighlight];
      localStorage.setItem(`story_highlights_${userId}`, JSON.stringify(updated));
      
      await refetch();
      setShowCreateModal(false);
      setNewTitle('');
      toast({ description: "Highlight created!" });
    } catch (error) {
      toast({ variant: "destructive", description: "Failed to create highlight" });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteHighlight = (highlightId: string) => {
    const updated = highlights.filter((h: Highlight) => h.id !== highlightId);
    localStorage.setItem(`story_highlights_${userId}`, JSON.stringify(updated));
    refetch();
    toast({ description: "Highlight deleted" });
  };

  const openHighlight = (highlight: Highlight) => {
    if (highlight.stories.length > 0) {
      setSelectedHighlight(highlight);
      setShowViewerModal(true);
    }
  };

  if (highlights.length === 0 && !isOwnProfile) return null;

  return (
    <div className="py-3">
      <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
        {/* Add new highlight button (only for own profile) */}
        {isOwnProfile && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">New</span>
          </button>
        )}
        
        {/* Existing highlights */}
        {highlights.map((highlight: Highlight) => (
          <button
            key={highlight.id}
            onClick={() => openHighlight(highlight)}
            className="flex flex-col items-center gap-1 flex-shrink-0 group relative"
          >
            <div className="h-16 w-16 rounded-full border-2 border-muted-foreground/30 p-0.5">
              <Avatar className="h-full w-full">
                <AvatarImage src={highlight.cover_url} className="object-cover" />
                <AvatarFallback>{highlight.title.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs truncate max-w-16">{highlight.title}</span>
            
            {isOwnProfile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteHighlight(highlight.id);
                }}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Create Highlight Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Highlight</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Highlight name..."
              maxLength={20}
            />
            
            {availableStories.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Will include your recent {Math.min(5, availableStories.length)} stories
                </p>
                <div className="flex gap-2 overflow-x-auto">
                  {availableStories.slice(0, 5).map((story: any) => (
                    <div key={story.id} className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0">
                      {story.media_type === 'video' ? (
                        <video src={story.media_url} className="h-full w-full object-cover" />
                      ) : (
                        <img src={story.media_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button 
              onClick={createHighlight} 
              disabled={!newTitle.trim() || isCreating}
              className="w-full"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Highlight'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Modal */}
      {showViewerModal && selectedHighlight && (
        <Dialog open={showViewerModal} onOpenChange={() => setShowViewerModal(false)}>
          <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-none w-full h-full max-h-none">
            <StoryViewer
              stories={selectedHighlight.stories}
              onClose={() => setShowViewerModal(false)}
              refetch={() => {}}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
