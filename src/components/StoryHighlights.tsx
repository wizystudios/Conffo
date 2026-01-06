import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch moments from localStorage (simulated - in production would use DB)
  const { data: highlights = [], refetch } = useQuery({
    queryKey: ['story-moments', userId],
    queryFn: async () => {
      const saved = localStorage.getItem(`story_moments_${userId}`);
      return saved ? JSON.parse(saved) : [];
    },
  });

  // Fetch user's stories that can be added to moments
  const { data: availableStories = [] } = useQuery({
    queryKey: ['available-stories-for-moments', userId],
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
      localStorage.setItem(`story_moments_${userId}`, JSON.stringify(updated));
      
      await refetch();
      setShowCreateModal(false);
      setNewTitle('');
      toast({ description: "Moment created!" });
    } catch (error) {
      toast({ variant: "destructive", description: "Failed to create moment" });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteHighlight = (highlightId: string) => {
    const updated = highlights.filter((h: Highlight) => h.id !== highlightId);
    localStorage.setItem(`story_moments_${userId}`, JSON.stringify(updated));
    refetch();
    toast({ description: "Moment deleted" });
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
        {/* Add new moment button (only for own profile) */}
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
        
        {/* Existing moments */}
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

      {/* Create Moment Modal - Full Page from Bottom */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="py-3 flex justify-center">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            
            <div className="p-4 space-y-4">
              <h2 className="text-xl font-bold text-center">Create New Moment</h2>
              
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Moment name..."
                maxLength={20}
                className="text-center"
              />
              
              {availableStories.length > 0 ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 text-center">
                    Will include your recent {Math.min(5, availableStories.length)} stories
                  </p>
                  <div className="flex gap-2 overflow-x-auto justify-center py-2">
                    {availableStories.slice(0, 5).map((story: any) => (
                      <div key={story.id} className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0 border-2 border-primary/20">
                        {story.media_type === 'video' ? (
                          <video src={story.media_url} className="h-full w-full object-cover" />
                        ) : (
                          <img src={story.media_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No stories available</p>
                  <p className="text-muted-foreground text-xs">Create stories first to add them to moments</p>
                </div>
              )}
              
              <Button 
                onClick={createHighlight} 
                disabled={!newTitle.trim() || isCreating || availableStories.length === 0}
                className="w-full h-12 rounded-xl"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Moment'}
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => setShowCreateModal(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {showViewerModal && selectedHighlight && (
        <div className="fixed inset-0 z-50 bg-black">
          <StoryViewer
            stories={selectedHighlight.stories}
            onClose={() => setShowViewerModal(false)}
            refetch={() => {}}
          />
        </div>
      )}
    </div>
  );
}